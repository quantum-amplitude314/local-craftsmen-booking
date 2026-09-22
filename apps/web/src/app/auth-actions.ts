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

const authenticate = async ({
  formData,
  mode,
}: {
  formData: FormData;
  mode: "login" | "register";
}): Promise<AuthFormState> => {
  const { parsed, state: validationState, values } = validateAuthForm({ formData, mode });
  if (!parsed.success) return validationState;

  try {
    const response = await sendAuthRequest({
      endpoint: mode === "register" ? "sign-up/email" : "sign-in/email",
      body: parsed.data,
    });
    if (!response.ok) {
      const { status } = response;
      const error: AuthError =
        status === 429
          ? "tooManyAttempts"
          : status >= 500
            ? "serviceUnavailable"
            : mode === "login"
              ? "loginFailed"
              : "registrationFailed";
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
