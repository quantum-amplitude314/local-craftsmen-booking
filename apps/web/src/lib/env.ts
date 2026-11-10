import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cacheLife } from "next/cache";
import { z } from "zod";

const envSchema = z
  .discriminatedUnion("WRANGLER_BINDING", [
    z.object({ WRANGLER_BINDING: z.literal("on"), WEB_ORIGIN: z.url() }),
    z.object({ WRANGLER_BINDING: z.literal("off"), WEB_ORIGIN: z.url(), API_URL: z.url() }),
  ])
  .readonly();

type Env = z.infer<typeof envSchema>;

const readWorkerEnv = async () => {
  const { env: workerEnv } = await getCloudflareContext({ async: true });

  return workerEnv;
};

const loadEnv = async () => {
  // only `.env.development` sets "off": `next dev` runs without wrangler
  const isNextDev = process.env.WRANGLER_BINDING === "off";
  const settings = isNextDev ? process.env : await readWorkerEnv();
  const parsed = envSchema.parse(settings);

  return parsed;
};

let env: Promise<Env> | undefined;

export const getEnv = () => {
  env ??= loadEnv();

  return env;
};

/** `null` in `next dev`, which runs without a Worker. */
export const getWorkerContext = async () => {
  const { WRANGLER_BINDING: wranglerBinding } = await getEnv();
  if (wranglerBinding === "off") return null;
  const workerContext = await getCloudflareContext({ async: true });

  return workerContext;
};

export const getWebOrigin = async () => {
  "use cache";
  cacheLife("max");
  const { WEB_ORIGIN: webOrigin } = await getEnv();

  return webOrigin;
};
