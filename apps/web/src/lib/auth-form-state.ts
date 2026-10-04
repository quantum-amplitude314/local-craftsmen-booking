import type { AuthFieldErrors, UserRole } from "@local-craftsmen/contracts";

export type AuthMode = "login" | "register";

export type AuthError =
  | "checkFields"
  | "tooManyAttempts"
  | "loginFailed"
  | "registrationFailed"
  | "serviceUnavailable"
  | "verificationFailed"
  | "logoutFailed";

export type AuthValues = { name: string; email: string; password: string; role: UserRole };

export type AuthFeedback = { error: AuthError | null; fieldErrors?: AuthFieldErrors };
