"use server";

import { loginSchema, registrationSchema } from "@local-craftsmen/contracts";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { sendAuthRequest } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-form-state";

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
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
  };
  const schema = mode === "register" ? registrationSchema : loginSchema;
  const result = schema.safeParse({
    ...values,
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!result.success) {
    const { error } = result;
    const fieldErrors = Object.fromEntries(
      error.issues.map(({ path, message }) => [path[0], message]),
    );
    const state = { error: "Check the highlighted fields.", fieldErrors, values };

    return state;
  }

  try {
    const response = await sendAuthRequest({
      endpoint: mode === "register" ? "sign-up/email" : "sign-in/email",
      body: result.data,
    });
    if (!response.ok) {
      const error =
        response.status === 429
          ? "Too many attempts. Please wait a moment and try again."
          : mode === "login"
            ? "Unable to sign in. Check your email and password and try again."
            : "Unable to create this account. Try another email or sign in if you already have an account.";
      const state = { error, values };

      return state;
    }
  } catch {
    const state = { error: "The account service is unavailable. Please try again.", values };

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
      const state = { error: "Unable to sign out. Please try again." };

      return state;
    }
  } catch {
    const state = { error: "The account service is unavailable. Please try again." };

    return state;
  }

  return redirect({ href: "/login", locale: getFormLocale(formData) });
};
