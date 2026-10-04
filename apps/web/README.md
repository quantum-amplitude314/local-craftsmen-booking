# Web runbook

Next.js on Cloudflare Workers (OpenNext). Commands run from the repo root. The API must be running
in the same setup (see `apps/api/README.md`).

| Setup | Build time (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) | Runtime (`wrangler.jsonc` vars) | API |
|---|---|---|---|
| `dev` | `.env.development`, test key | `env.development` | `dev`, HTTP to `API_URL` |
| `preview` | `.env.preview`, real key | `env.preview` | API `preview`, service binding |
| `deploy` | `.env.production`, real key | top level | deployed Worker, service binding |

A build-time change needs a rebuild. Runtime values are validated by `src/lib/env.ts`.

## First setup

```zsh
cp apps/web/wrangler.example.jsonc apps/web/wrangler.jsonc
```

Then create `.env.preview` and `.env.production` with the real site key.

## Local dev

```zsh
bun run --cwd apps/web dev       # http://localhost:3000
```

## Local preview

```zsh
bun run --cwd apps/web preview   # OpenNext build + wrangler dev, http://localhost:8787
```

## Deploy

Deploy the API first. `next build` fails on type errors, so run `bun run typecheck` before.

```zsh
bun run --cwd apps/web deploy
```
