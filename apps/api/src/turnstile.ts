import { z } from "zod";

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const verifyTimeoutMs = 5_000;
const siteverifySchema = z.object({ success: z.boolean() });

/** Checks Turnstile tokens on our own routes; Better Auth's captcha plugin covers only its own. */
export const createTurnstile = ({ secretKey }: { secretKey: string }) => {
  const verify = async ({ token }: { token: string }) => {
    const response = await fetch(siteverifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
      signal: AbortSignal.timeout(verifyTimeoutMs),
    });
    if (!response.ok) throw new Error(`Turnstile answered ${response.status}`);
    const { success } = siteverifySchema.parse(await response.json());

    return success;
  };

  const turnstile = { verify };

  return turnstile;
};

export type Turnstile = ReturnType<typeof createTurnstile>;
