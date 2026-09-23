# Local Craftsmen

Booking platform connecting customers with local craftsmen. Portfolio project.

## Workspace

- `apps/web` — Next.js 16, shadcn/ui (Base UI), Tailwind 4, next-intl (English, Czech)
- `apps/api` — Hono + oRPC, on Bun locally and Cloudflare Workers in the cloud
- `packages/application` — framework-neutral application services
- `packages/contracts` — oRPC contract (Zod), the API's single source of routes and types
- `packages/db` — Drizzle schema, migrations, location data and seeds
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

Set `BETTER_AUTH_SECRET` in `apps/api/.env.local`, then start and seed the database:

```sh
bun run db:up
bun run db:seed:test
```

- `db:seed:reference` upserts cities and districts from `packages/db/data/locations.json`. It never
  deletes and is safe on any migrated database, production included.
- `db:seed:test` (localhost only) migrates, runs the reference seed and adds demo users and slots.
  To start over: `bun run db:clear && bun run db:seed:test`.

Dependency lifecycle scripts never run: the root `package.json` sets `"trustedDependencies": []`.

## Development

```sh
bun run dev        # web on :3000, API on :3001
bun run db:down    # stop PostgreSQL, keep data
```

## Verification

```sh
bun run lint-fix
bun run typecheck
bun run test       # database, API integration and Worker runtime tests; needs PostgreSQL
bun run build      # web build and Worker dry run
bun run api:test   # Bruno collection against a fresh craftsmen_test database on port 3002
```

## Architecture

- The Hono app is shared by the Bun and Worker entry points, which supply the database and services.
  Business logic lives in `packages/application`.
- A slot's service coverage (city, optional district) is separate from the craftsman's base location.
- Booking any part of a slot creates the booking, copies the agreed price, writes a history snapshot and
  deletes the whole slot in one transaction. PostgreSQL exclusion constraints and row locks make
  concurrent requests unable to double-book.
- better-auth sessions live on the API; Server Actions forward and re-issue the session cookie, so no
  token reaches client code. Each account has one role, `customer` or `craftsman`, fixed at registration.

## Cloudflare deployment

Planned; development runs on Bun and local PostgreSQL.

1. Create a Neon PostgreSQL database.
2. Create a Hyperdrive configuration for Neon's direct connection string, with caching disabled, and
   put its ID in your local `apps/api/wrangler.jsonc`.
3. Set `DATABASE_URL` in `packages/db/.env.local` to the direct connection string, then run
   `bun run db:migrate` and `bun run db:seed:reference`.
4. Run `bun run --cwd apps/api deploy`.

`bun run --cwd apps/api dev:preview` runs the Worker locally against Wrangler's `localConnectionString`;
it does not reproduce Hyperdrive pooling.
