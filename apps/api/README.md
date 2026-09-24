# API runbook

Private Hono Worker (no public URL); the web reaches it through a service binding. Commands run
from the repo root.

| Env | Holds | Used by |
|---|---|---|
| `.env.local` | `BETTER_AUTH_*`, `WEB_ORIGIN`, test `TURNSTILE_SECRET_KEY` | `dev`, `dev:preview` |
| `packages/db/.env.local` | `DATABASE_URL` | `dev`, db scripts |
| `wrangler.jsonc` | `vars`, Hyperdrive `id` (production), `localConnectionString` (Neon preview) | `dev:preview`, deploy |
| Worker secrets | `BETTER_AUTH_SECRET`, real `TURNSTILE_SECRET_KEY` | deployed Worker |

## First setup

```zsh
cp apps/api/.env.example apps/api/.env.local
cp apps/api/wrangler.example.jsonc apps/api/wrangler.jsonc
cp packages/db/.env.example packages/db/.env.local
```

## Local dev

Bun, local Postgres.

```zsh
bun run db:up
bun run db:migrate && bun run db:seed:reference   # empty database only
bun run --cwd apps/api dev                        # http://localhost:3001
```

## Local preview

`wrangler dev`, Neon preview branch through `localConnectionString` (pooler host).

```zsh
bun run --cwd apps/api dev:preview                # http://localhost:3001
```

## Deploy

1. Migrations, when the schema changed: point `DATABASE_URL` in `packages/db/.env.local` at
   production (direct host), `bun run db:migrate`, switch back.
2. Secrets, once per Worker:
   `bunx wrangler secret put BETTER_AUTH_SECRET` and `bunx wrangler secret put TURNSTILE_SECRET_KEY`
   from `apps/api`.
3. `bun run --cwd apps/api deploy`

Deploy before the web; its binding needs this Worker.
