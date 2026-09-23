# Local Craftsmen

Booking platform connecting customers with local craftsmen. Demo PoC project.

Currently implemented: authentication, profile/rate editing, canonical cities and districts,
slot-specific service coverage and search, and backend booking creation. A booking atomically
consumes the entire selected slot. The operational dashboard and booking UI are the next phase.

## Workspace

- `apps/web` — Next.js 16, shadcn/ui (Base UI), Tailwind 4
- `apps/api` — Hono + oRPC on Bun locally and Cloudflare Workers for preview/production
- `packages/application` — framework-neutral application services
- `packages/contracts` — oRPC contract (Zod)
- `packages/db` — Drizzle schema + migrations
- `packages/config` — shared tsconfig

## Local setup

Requires Bun and Podman with Compose support.

```sh
bun install
cp packages/db/.env.example packages/db/.env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/api/wrangler.example.jsonc apps/api/wrangler.jsonc
```

Env files: `.env.local` holds your local development values and is not committed; `.env.test` holds
committed test values; `.env.example` is the template.

Set `BETTER_AUTH_SECRET` in `apps/api/.env.local`, then start the database and seed it:

```sh
bun run db:up
bun run db:seed
```

Seeding applies migrations and refuses a database that already has them. To start over, clear the
local database first; this drops all tables and data:

```sh
bun run db:clear
bun run db:seed
```

Register a new account at `/register` to try authentication; the seeded directory profiles have no
login credentials.

## Development

```sh
bun run dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Run separately: `bun run web:dev` or `bun run api:dev`.
- Stop PostgreSQL: `bun run db:down` (keeps the data volume).

## Verification

```sh
bun run lint-fix
bun run typecheck
bun run test
bun run build
```

Tests cover database constraints, authentication/ownership, location matching, atomic slot consumption,
booking-price/history snapshots, concurrent booking requests, and Worker routing. PostgreSQL must be running.
The build compiles the web app and performs a Worker dry run.

Run the Bruno collection against a fresh test database:

```sh
bun run api:test
```

This resets `craftsmen_test`, starts the API on port 3002 with `.env.test`, runs the collection, and
stops the API. It does not touch the development database or a running dev API. Results are written
to `apps/api/test-results/bruno-report.json`.

## Architecture

The Hono app is shared between Bun and Cloudflare Workers. Runtime entry points supply the database
and services; reusable business logic lives in `packages/application`, with typed API contracts in
`packages/contracts`.

Local development uses a shared Postgres.js pool that survives hot reloads and closes on shutdown.
The Worker entry point creates request-local clients, with Hyperdrive managing upstream pooling.

### Locations, availability, and bookings

- Cities and districts are maintained records. A district must belong to its specified city.
- A profile's base location is separate from each availability slot's coverage.
- `availability_area` links a slot to cities and optional districts; a null district covers the whole city.
  Its city ID is intentionally denormalized for city filtering, documented in both the schema and
  database column comment, and protected by a composite district/city foreign key.
- Booking any part of a slot deletes the entire slot and its coverage links in the same transaction
  that creates the booking and history snapshot. Concurrent requests cannot consume a slot twice.
- Booking prices are copied from the craftsman's offered currency rate. History snapshots deliberately
  have no foreign keys, so they survive changes or deletion of operational records.
- The migration chain was rebuilt as `packages/db/migrations/0000_init.sql`. It includes PostgreSQL
  exclusion constraints and database comments maintained explicitly alongside generated DDL.

Backend routes:

```text
GET    /locations
GET    /slots?craft=&cityId=&districtId=&start=&end=
GET    /craftsmen/{id}
GET    /me/profile
PUT    /me/profile
GET    /me/availability
POST   /me/availability
DELETE /me/availability/{id}
POST   /bookings
GET    /me/bookings
```

Profile and availability writes require a craftsman session; booking creation requires a customer
session. Private ownership is derived from the session. A booking request supplies `slotId`, `start`,
`end`, `location: { cityId, districtId }`, and `currency`; its craftsman and rate come from the server.
Booking lifecycle transitions and history presentation are subsequent work.

### Authentication

better-auth handles email and password sign-up, sign-in, and database-backed sessions under
`/auth/*` on the API. Each account picks a role (`customer` or `craftsman`) at registration; the role
is immutable afterwards. Hono middleware validates the session cookie and guards private routes such
as `/me`.

Server Actions call the auth API, forward incoming cookies, and re-issue the returned session cookie.
Server Components read the signed-in user through `/me`. Sessions expire after seven days without
rolling renewal.

### Local preview

```sh
bun run --cwd apps/api dev:preview
```

This runs the Worker locally and connects to the database set in Wrangler's `localConnectionString`,
for example the Neon `preview` branch. Real Hyperdrive pooling and caching are verified separately
when cloud resources are provisioned.

## Cloudflare deployment

Cloud deployment is planned; feature development currently runs on Bun and local PostgreSQL.

1. Create a Neon PostgreSQL database.
2. Create a Cloudflare Hyperdrive configuration for its pooled connection with query caching
   disabled.
3. Replace the placeholder Hyperdrive ID in your local `apps/api/wrangler.jsonc`.
4. Set `DATABASE_URL` in `packages/db/.env.local` to Neon's direct connection URL and run
   `bun run db:migrate`.
5. Run `bun run --cwd apps/api deploy`.
