# Local Craftsmen

Booking platform connecting customers with local craftsmen. PoC Demo Project.

## Repo layout

```
apps/web                Next.js
apps/api                Hono app, oRPC router, Bun entry, Worker entry, Bruno collection
packages/application    framework-neutral application services
packages/contracts      oRPC contract: Zod schemas, shared enums, routes
packages/db             Drizzle schema, migrations, location data, seeds
packages/config         shared tsconfig and Biome
apps/api/bruno          Bruno collection
```

## Architecture

| Layer | Choice |
|---|---|
| Monorepo | Bun workspaces, Turbo, Biome, tsc |
| Web | Next.js App Router, React 19, shadcn/ui, Tailwind, next-intl (English default, Czech under `/cs`) |
| API | Hono + oRPC OpenAPI handler; application services shared by the Bun and Worker entries |
| Contract | oRPC contract in `packages/contracts` (Zod, REST routes), typed client in the web, no codegen |
| Database | PostgreSQL, Postgres.js, Drizzle ORM and drizzle-kit migrations |
| Auth | Better Auth, email and password, database sessions, roles `customer` / `craftsman` |
| Bot protection | Turnstile on sign-in and registration, verified by the API (Better Auth captcha plugin) |
| Tests | Vitest (logic, Worker runtime), Bun test for API integration against real PostgreSQL |
| Hosting | Two Cloudflare Workers: private API through Hyperdrive, web through OpenNext |

## Local setup

```sh
bun install
cp packages/db/.env.example packages/db/.env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/api/wrangler.example.jsonc apps/api/wrangler.jsonc
cp apps/web/.env.example apps/web/.env.local
cp apps/web/.dev.vars.example apps/web/.dev.vars
cp apps/web/wrangler.example.jsonc apps/web/wrangler.jsonc
```

Set `BETTER_AUTH_SECRET` in `apps/api/.env.local`, then start and seed the database:

```sh
bun run db:up
bun run db:migrate
bun run db:seed:reference # upserts cities and districts from `packages/db/data/locations.json`
```

## Development

```sh
bun run dev 
bun run lint-fix
bun run typecheck
bun run test       # database, API integration and Worker runtime tests; needs PostgreSQL
bun run build      # web build and Worker dry run
```

## Deployment

Two Cloudflare Workers; the API has no public URL.

```text
browser → web Worker (Next.js, OpenNext) ─service binding→ API Worker (Hono) ─Hyperdrive→ Neon PostgreSQL
```

- [API runbook](apps/api/README.md): env files, Neon and Hyperdrive, migrations, secrets, deploy.
- [Web runbook](apps/web/README.md): build-time Turnstile key, binding switch, preview, deploy.
- Deploy the API first; the web's service binding needs it. Both run locally as Workers
  (`dev:preview`, `preview`) against a Neon preview branch.
