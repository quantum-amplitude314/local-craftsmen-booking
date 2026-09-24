# Web runbook

Next.js on Cloudflare Workers (OpenNext). Commands run from the repo root. The API must be running
(see `apps/api/README.md`).

| Env | Holds | Used by |
|---|---|---|
| `.env.local` | build-time `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | every build; a change needs a rebuild |
| `.dev.vars` | runtime `WRANGLER_BINDING`, `API_URL`, `WEB_ORIGIN` | `dev`, `preview`; never deployed |
| `wrangler.jsonc` `vars` | runtime production values | deployed Worker |

## First setup

```zsh
cp apps/web/.env.example apps/web/.env.local
cp apps/web/.dev.vars.example apps/web/.dev.vars
cp apps/web/wrangler.example.jsonc apps/web/wrangler.jsonc
```

## Switches

- `WRANGLER_BINDING` in `.dev.vars`: `off` calls the API over HTTP at `API_URL`; `on` goes through
  the `API` service binding and needs the API running with `dev:preview`. Production is always
  `on`, from `wrangler.jsonc` `vars`.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `.env.local`: a test key locally (pairs with the API's test
  secret), use the real key for `deploy`.

## Local dev

```zsh
bun run --cwd apps/web dev       # http://localhost:3000, WRANGLER_BINDING=off
```

## Local preview

```zsh
bun run --cwd apps/web preview   # OpenNext build + wrangler dev, http://localhost:8787
```

Keep `WRANGLER_BINDING=off`, or set `on` to test the service binding.

## Deploy

Deploy the API first. `next build` fails on type errors, so run `bun run typecheck` before.

1. Uncomment the real `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `.env.local`.
2. `bun run --cwd apps/web deploy`
3. Switch `.env.local` back to the test key.

`.dev.vars` needs no change for deploy.
