import {
  getAuthFieldErrors,
  loginSchema,
  registrationSchema,
  userRoleSchema,
} from "@local-craftsmen/contracts";
import type { AuthFormState } from "./auth-form-state";

export const validateAuthForm = ({
  formData,
  mode,
}: {
  formData: FormData;
  mode: "login" | "register";
}) => {
  const input = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  };
  const { name, email, role } = input;
  const parsedRole = userRoleSchema.safeParse(role);
  const values = {
    name: typeof name === "string" ? name : "",
    email: typeof email === "string" ? email.trim() : "",
    role: parsedRole.success ? parsedRole.data : userRoleSchema.enum.customer,
  };
  const schema = mode === "register" ? registrationSchema : loginSchema;
  const parsed = schema.safeParse(input);
  const state: AuthFormState = parsed.success
    ? { error: null, values }
    : { error: "checkFields", fieldErrors: getAuthFieldErrors(parsed.error), values };
  const result = { parsed, state, values };

  return result;
};
