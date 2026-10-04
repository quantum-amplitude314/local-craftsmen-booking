import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const envSchema = z.discriminatedUnion("WRANGLER_BINDING", [
  z.object({ WRANGLER_BINDING: z.literal("on"), WEB_ORIGIN: z.url() }),
  z.object({ WRANGLER_BINDING: z.literal("off"), WEB_ORIGIN: z.url(), API_URL: z.url() }),
]);

/** Vars the web server reads, validated on each read. */
export const getEnv = async () => {
  const { env } = await getCloudflareContext({ async: true });
  const parsed = envSchema.parse(env);

  return parsed;
};
