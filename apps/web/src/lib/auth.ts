import "server-only";

import { sessionUserSchema } from "@local-craftsmen/contracts";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies } from "next/headers";
import { cache } from "react";
import { apiFetch, getApiBaseUrl } from "@/lib/api-fetch";
import { getEnv } from "@/lib/env";

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  if (
    !cookieStore.has("better-auth.session_token") &&
    !cookieStore.has("__Secure-better-auth.session_token")
  )
    return null;

  const request = new Request(new URL("/me", await getApiBaseUrl()), {
    headers: { cookie: cookieStore.toString() },
  });
  const response = await apiFetch(request);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Unable to load your account. Please try again.");

  const user = sessionUserSchema.parse(await response.json());

  return user;
});

export const sendAuthRequest = async ({
  endpoint,
  body,
  captchaToken,
}: {
  endpoint: "sign-in/email" | "sign-up/email" | "sign-out";
  body: Record<string, unknown>;
  captchaToken?: string | undefined;
}) => {
  const cookieStore = await cookies();
  const { WEB_ORIGIN: webOrigin } = await getEnv();
  const request = new Request(new URL(`/auth/${endpoint}`, await getApiBaseUrl()), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: webOrigin,
      Cookie: cookieStore.toString(),
      ...(captchaToken && { "x-captcha-response": captchaToken }),
    },
    body: JSON.stringify(body),
  });
  const response = await apiFetch(request);

  for (const header of response.headers.getSetCookie()) {
    for (const [name, attributes] of parseSetCookieHeader(header)) {
      const { value } = attributes;
      cookieStore.set(name, value, toCookieOptions(attributes));
    }
  }

  return response;
};
