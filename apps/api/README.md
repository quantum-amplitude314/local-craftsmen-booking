# API runbook

Private Hono Worker (no public URL); the web reaches it through a service binding. Commands run
from the repo root.

| Setup | Vars and bindings | Secrets | Database |
|---|---|---|---|
| `dev` (Bun) | `.env.development` | `.env.development` | `packages/db/.env.development` |
| `dev:preview` | `wrangler.jsonc` `env.preview` | `.env.preview` | `env.preview` Hyperdrive `localConnectionString` |
| `test` (Worker tests) | `wrangler.jsonc` `env.test` | `.env.test` | `env.test` Hyperdrive `localConnectionString` |
| `deploy` | `wrangler.jsonc` top level | `.env.production`, uploaded | Hyperdrive `id` |

## First setup

```zsh
cp apps/api/wrangler.example.jsonc apps/api/wrangler.jsonc
```

Then create `.env.preview` and `.env.production` with the secrets, `packages/db/.env.preview` and
`.env.production` with the database URLs, and set the preview `localConnectionString` and the
production Hyperdrive `id` in `wrangler.jsonc`.

## Local dev

```zsh
bun run db:up
bun run db:migrate && bun run db:seed:reference   # empty database only
bun run --cwd apps/api dev                        # http://localhost:3001
```

## Local preview

```zsh
bun run db:migrate:preview                        # when the schema changed
bun run --cwd apps/api dev:preview                # http://localhost:3001
```

## Deploy

```zsh
bun run db:migrate:production                     # when the schema changed
bun run --cwd apps/api deploy
```

Deploy before the web; its binding needs this Worker.
