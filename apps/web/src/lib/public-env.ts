import { z } from "zod";

/**
 * Browser-visible config, inlined at build time. Each key must be spelled out as
 * `process.env.NEXT_PUBLIC_*` for Next to replace it; a missing value fails the build.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
