import { databaseEnvSchema } from "@local-craftsmen/db/env";
import { z } from "zod";

export const apiEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
  TURNSTILE_SECRET_KEY: z.string().min(1),
});

const bunEnvSchema = apiEnvSchema.extend({
  ...databaseEnvSchema.shape,
  API_URL: z.url(),
});

export const parseWorkerEnv = (bindings: Env) => {
  const workerEnv = apiEnvSchema.parse(bindings);

  return workerEnv;
};

export const readBunEnv = () => {
  const bunEnv = bunEnvSchema.parse(process.env);

  return bunEnv;
};
