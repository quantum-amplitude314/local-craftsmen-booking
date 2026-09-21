# Local Craftsmen

Booking platform connecting customers with local craftsmen. Portfolio project.

Currently implemented: a public craftsmen directory, email/password registration and login,
and a role-aware account page. Profile editing, availability management, and booking flows are next.

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
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example apps/api/.env
cp apps/api/wrangler.example.jsonc apps/api/wrangler.jsonc
```

Set `BETTER_AUTH_SECRET` in `apps/api/.env`, then start the database and seed it:

```sh
bun run db:up
bun run db:seed
```

Seeding also applies migrations. Register a new account at `/register` to try authentication;
the seeded directory profiles have no login credentials.

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

Tests cover database constraints, the auth flow, and Worker routing. PostgreSQL must be running.
The build compiles the web app and performs a Worker dry run.

With the API running, execute the Bruno collection:

```sh
bun run api:test
```

## Architecture

The Hono app is shared between Bun and Cloudflare Workers. Runtime entry points supply the database
and services; reusable business logic lives in `packages/application`, with typed API contracts in
`packages/contracts`.

Local development uses a shared Postgres.js pool that survives hot reloads and closes on shutdown.
The Worker entry point creates request-local clients, with Hyperdrive managing upstream pooling.

### Authentication

better-auth handles email and password sign-up, sign-in, and database-backed sessions under
`/auth/*` on the API. Each account picks a role (`customer` or `craftsman`) at registration; the role
is immutable afterwards. Hono middleware validates the session cookie and guards private routes such
as `/me`.

Server Actions call the auth API, forward incoming cookies, and re-issue the returned session cookie.
Server Components read the signed-in user through `/me`. Sessions expire after seven days without
rolling renewal.

### Worker development

```sh
bun run --cwd apps/api dev:worker
```

This connects to local PostgreSQL through Wrangler's `localConnectionString`. Real Hyperdrive
pooling and caching are verified separately when cloud resources are provisioned.

## Cloudflare deployment

Cloud deployment is planned; feature development currently runs on Bun and local PostgreSQL.

1. Create a Neon PostgreSQL database.
2. Create a Cloudflare Hyperdrive configuration for its pooled connection with query caching
   disabled.
3. Replace the placeholder Hyperdrive ID in your local `apps/api/wrangler.jsonc`.
4. Set `DATABASE_URL` in `packages/db/.env` to Neon's direct connection URL and run
   `bun run db:migrate`.
5. Run `bun run --cwd apps/api deploy`.
