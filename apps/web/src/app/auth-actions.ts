"use server";

import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { sendAuthRequest } from "@/lib/auth";
import type { AuthError, AuthFormState } from "@/lib/auth-form-state";
import { validateAuthForm } from "@/lib/auth-form-validation";

const getFormLocale = (formData: FormData) => {
  const requestedLocale = formData.get("locale");
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  return locale;
};

// Better Auth captcha plugin codes for a missing or rejected Turnstile token.
const captchaErrorCodes: unknown[] = ["MISSING_RESPONSE", "VERIFICATION_FAILED"];

const readAuthError = async ({
  response,
  mode,
}: {
  response: Response;
  mode: "login" | "register";
}): Promise<AuthError> => {
  const { status } = response;
  if (status === 429) return "tooManyAttempts";
  if (status >= 500) return "serviceUnavailable";

  const body: { code?: unknown } | null = await response.json().catch(() => null);
  const error = captchaErrorCodes.includes(body?.code)
    ? "verificationFailed"
    : mode === "login"
      ? "loginFailed"
      : "registrationFailed";

  return error;
};

const authenticate = async ({
  formData,
  mode,
}: {
  formData: FormData;
  mode: "login" | "register";
}): Promise<AuthFormState> => {
  const { parsed, state: validationState, values } = validateAuthForm({ formData, mode });
  if (!parsed.success) return validationState;

  const captchaToken = formData.get("cf-turnstile-response");

  try {
    const response = await sendAuthRequest({
      endpoint: mode === "register" ? "sign-up/email" : "sign-in/email",
      body: parsed.data,
      captchaToken: typeof captchaToken === "string" ? captchaToken : undefined,
    });
    if (!response.ok) {
      const error = await readAuthError({ response, mode });
      const state = { error, values };

      return state;
    }
  } catch {
    const state: AuthFormState = { error: "serviceUnavailable", values };

    return state;
  }

  return redirect({ href: "/dashboard", locale: getFormLocale(formData) });
};

// Server Actions passed to `useActionState` must keep React's (previousState, formData) signature
// so the forms still submit without client JavaScript.
export const login = async (_previousState: AuthFormState, formData: FormData) => {
  const state = await authenticate({ formData, mode: "login" });

  return state;
};

export const register = async (_previousState: AuthFormState, formData: FormData) => {
  const state = await authenticate({ formData, mode: "register" });

  return state;
};

export const logout = async (
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  try {
    const response = await sendAuthRequest({ endpoint: "sign-out", body: {} });
    if (!response.ok) {
      const state: AuthFormState = { error: "logoutFailed" };

      return state;
    }
  } catch {
    const state: AuthFormState = { error: "serviceUnavailable" };

    return state;
  }

  return redirect({ href: "/login", locale: getFormLocale(formData) });
};
