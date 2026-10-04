# Database runbook

Drizzle schema, migrations and reference data. Commands run from the repo root.

| Setup | Env file | Database |
|---|---|---|
| development | `.env.development`, committed | local PostgreSQL (`compose.yml`) |
| test | `.env.test`, committed | local `craftsmen_test`, wiped by the tests |
| preview | `.env.preview` | Neon `preview` branch |
| production | `.env.production` | Neon `production` branch |

`src/env.ts` validates `DATABASE_URL` (`TEST_DATABASE_URL` in `.env.test`).

## First setup

Create `.env.preview` and `.env.production` with the Neon connection strings.

## Commands

```zsh
bun run db:up                            # local PostgreSQL
bun run db:migrate                       # also :preview, :production
bun run db:seed:reference                # cities and districts, empty database; also :preview, :production
bun run db:clear                         # development: drops all tables and migration history
bun run --cwd packages/db db:generate    # new migration after a schema change
```
