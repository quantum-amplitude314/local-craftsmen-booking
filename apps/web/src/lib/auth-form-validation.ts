import { getAuthFieldErrors, loginSchema, registrationSchema } from "@local-craftsmen/contracts";
import type { AuthFeedback, AuthMode, AuthValues } from "./auth-form-state";

/** The same check runs in the browser before sending and in the server action. */
export const validateAuthForm = ({ values, mode }: { values: AuthValues; mode: AuthMode }) => {
  const schema = mode === "register" ? registrationSchema : loginSchema;
  const parsed = schema.safeParse(values);
  const feedback: AuthFeedback = parsed.success
    ? { error: null }
    : { error: "checkFields", fieldErrors: getAuthFieldErrors(parsed.error) };
  const result = { parsed, feedback };

  return result;
};
