import { databaseEnvSchema } from "@local-craftsmen/db/env";
import { z } from "zod";

/**
 * Runtime values both entries read. Worker: `vars` in wrangler.jsonc plus `wrangler secret put`
 * secrets. Local Bun entry and `wrangler dev`: `.env.local`.
 */
export const apiEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
  TURNSTILE_SECRET_KEY: z.string().min(1),
});

/** The Worker connects through the Hyperdrive binding; the Bun entry needs its own URL and port. */
const bunEnvSchema = apiEnvSchema.extend({
  ...databaseEnvSchema.shape,
  PORT: z.coerce.number().int().default(3001),
});

export const parseWorkerEnv = (bindings: Env) => {
  const workerEnv = apiEnvSchema.parse(bindings);

  return workerEnv;
};

export const readBunEnv = () => {
  const bunEnv = bunEnvSchema.parse(process.env);

  return bunEnv;
};
