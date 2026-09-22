import type { AuthFieldErrors, UserRole } from "@local-craftsmen/contracts";

export type AuthError =
  | "checkFields"
  | "tooManyAttempts"
  | "loginFailed"
  | "registrationFailed"
  | "serviceUnavailable"
  | "logoutFailed";

export type AuthFormState = {
  error: AuthError | null;
  fieldErrors?: AuthFieldErrors;
  values?: { name: string; email: string; role: UserRole };
};
