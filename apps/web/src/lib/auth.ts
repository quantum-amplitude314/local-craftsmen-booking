import "server-only";

import { sessionUserSchema } from "@local-craftsmen/contracts";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies } from "next/headers";
import { cache } from "react";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  if (
    !cookieStore.has("better-auth.session_token") &&
    !cookieStore.has("__Secure-better-auth.session_token")
  )
    return null;

  const response = await fetch(`${apiUrl}/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Unable to load your account. Please try again.");

  const user = sessionUserSchema.parse(await response.json());

  return user;
});

export const sendAuthRequest = async ({
  endpoint,
  body,
}: {
  endpoint: "sign-in/email" | "sign-up/email" | "sign-out";
  body: Record<string, unknown>;
}) => {
  const cookieStore = await cookies();
  const response = await fetch(`${apiUrl}/auth/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: webOrigin,
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  for (const header of response.headers.getSetCookie()) {
    for (const [name, attributes] of parseSetCookieHeader(header)) {
      const { value } = attributes;
      cookieStore.set(name, value, toCookieOptions(attributes));
    }
  }

  return response;
};
