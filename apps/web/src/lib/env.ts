import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const envSchema = z
  .discriminatedUnion("WRANGLER_BINDING", [
    z.object({ WRANGLER_BINDING: z.literal("on"), WEB_ORIGIN: z.url() }),
    z.object({ WRANGLER_BINDING: z.literal("off"), WEB_ORIGIN: z.url(), API_URL: z.url() }),
  ])
  .readonly();

type Env = z.infer<typeof envSchema>;

const loadEnv = async () => {
  const { env: workerEnv } = await getCloudflareContext({ async: true });
  const parsed = envSchema.parse(workerEnv);

  return parsed;
};

let env: Promise<Env> | undefined;

export const getEnv = () => {
  env ??= loadEnv();

  return env;
};
