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
```

- First setup sections in
- [API runbook](apps/api/README.md)
- [Web runbook](apps/web/README.md)

## Development

```sh
bun run dev 
bun run lint-fix
bun run typecheck
bun run test       # database, API integration and Worker runtime tests; needs PostgreSQL
bun run build      # web build and Worker dry run
```

## Deployment

```text
browser → web Worker (Next.js, OpenNext) ─service binding →
API Worker (Hono) ─Hyperdrive → Neon PostgreSQL
```

- Deploy the API first; the web's service binding needs it. Both can run locally as Workers in wrangler preview (`dev:preview`, `preview`) against a Neon preview branch
