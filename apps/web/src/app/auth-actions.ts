"use server";

import { hasLocale } from "next-intl";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { sendAuthRequest } from "@/lib/auth";
import type { AuthError, AuthFeedback, AuthMode, AuthValues } from "@/lib/auth-form-state";
import { validateAuthForm } from "@/lib/auth-form-validation";

type AuthRequest = { values: AuthValues; captchaToken: string | null; locale: string };

const toLocale = (locale: string) =>
  hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;

// Better Auth captcha plugin codes for a missing or rejected Turnstile token.
const captchaErrorCodes: unknown[] = ["MISSING_RESPONSE", "VERIFICATION_FAILED"];
const authErrorBodySchema = z.object({ code: z.unknown() }).catch({ code: undefined });

const readAuthError = async ({
  response,
  mode,
}: {
  response: Response;
  mode: AuthMode;
}): Promise<AuthError> => {
  const { status } = response;
  if (status === 429) return "tooManyAttempts";
  if (status >= 500) return "serviceUnavailable";

  const { code } = authErrorBodySchema.parse(await response.json().catch(() => null));
  const error = captchaErrorCodes.includes(code)
    ? "verificationFailed"
    : mode === "login"
      ? "loginFailed"
      : "registrationFailed";

  return error;
};

const authenticate = async ({
  mode,
  values,
  captchaToken,
  locale,
}: AuthRequest & { mode: AuthMode }): Promise<AuthFeedback> => {
  const { parsed, feedback } = validateAuthForm({ values, mode });
  if (!parsed.success) return feedback;

  try {
    const response = await sendAuthRequest({
      endpoint: mode === "register" ? "sign-up/email" : "sign-in/email",
      body: parsed.data,
      captchaToken: captchaToken ?? undefined,
    });
    if (!response.ok) {
      const failed: AuthFeedback = { error: await readAuthError({ response, mode }) };

      return failed;
    }
  } catch {
    const unavailable: AuthFeedback = { error: "serviceUnavailable" };

    return unavailable;
  }

  return redirect({ href: "/dashboard", locale: toLocale(locale) });
};

export const login = async (request: AuthRequest) => {
  const feedback = await authenticate({ ...request, mode: "login" });

  return feedback;
};

export const register = async (request: AuthRequest) => {
  const feedback = await authenticate({ ...request, mode: "register" });

  return feedback;
};

export const logout = async ({ locale }: { locale: string }): Promise<AuthFeedback> => {
  try {
    const response = await sendAuthRequest({ endpoint: "sign-out", body: {} });
    if (!response.ok) {
      const failed: AuthFeedback = { error: "logoutFailed" };

      return failed;
    }
  } catch {
    const unavailable: AuthFeedback = { error: "serviceUnavailable" };

    return unavailable;
  }

  return redirect({ href: "/login", locale: toLocale(locale) });
};
