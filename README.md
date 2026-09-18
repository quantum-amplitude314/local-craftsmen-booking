# Local Craftsmen

Booking platform connecting customers with local craftsmen. Portfolio project.

- `apps/web` — Next.js 16, shadcn/ui (Base UI), Tailwind 4
- `apps/api` — Hono + oRPC on Bun locally and Cloudflare Workers for preview/production
- `packages/application` — framework-neutral application services
- `packages/contracts` — oRPC contract (Zod)
- `packages/db` — Drizzle schema + migrations
- `packages/config` — shared tsconfig

```sh
bun install
cp packages/db/.env.example packages/db/.env
cp apps/api/wrangler.example.jsonc apps/api/wrangler.jsonc
bun run db:up
bun run db:seed
bun run dev          # web :3000, Hono on Bun :3001
bun run typecheck
bun run lint-fix
bun run test         # requires the project PostgreSQL container
bun run db:down      # removes this project's container; keeps its data volume
```

The repository includes configuration templates; actual Wrangler configuration and local environment
files stay untracked. Copy the Wrangler template before running Worker development, tests, builds,
or API typechecking. `bun run typecheck` generates the ignored `next-env.d.ts` and
`worker-configuration.d.ts` files.

Local development runs Hono directly on Bun with one HMR-safe Postgres.js pool connected to the
Podman PostgreSQL service. Each request receives a fresh API context backed by that shared pool. The
API keeps Hono-specific request handling inside `apps/api`; reusable application services live in
`packages/application`.

`bun run --cwd apps/api dev:worker` remains available for Worker-runtime checks against the local
database. Wrangler's `localConnectionString` connects directly to PostgreSQL and does not emulate
Hyperdrive's production pooling or caching.

## Cloudflare deployment

1. Create a Neon PostgreSQL database.
2. Create a Cloudflare Hyperdrive configuration for its pooled connection with query caching
   disabled.
3. Replace the placeholder Hyperdrive ID in your local `apps/api/wrangler.jsonc`.
4. Set `DATABASE_URL` in `packages/db/.env` to Neon's direct connection URL and run
   `bun run db:migrate`.
5. Run `bun run --cwd apps/api deploy`.

Migrations use the direct Neon connection and are not run by the Worker or automatically rolled
back when a Worker deployment fails.
