import { oc } from "@orpc/contract";
import { z } from "zod";

const authValidationErrorSchema = z.enum([
  "invalidValue",
  "emailInvalid",
  "passwordTooShort",
  "passwordTooLong",
  "nameRequired",
  "nameTooLong",
  "roleInvalid",
]);
const { enum: validationErrors } = authValidationErrorSchema;
export type AuthValidationError = z.infer<typeof authValidationErrorSchema>;

const authFieldSchema = z.enum(["name", "email", "password", "role"]);
export type AuthField = z.infer<typeof authFieldSchema>;
export type AuthFieldErrors = Partial<Record<AuthField, AuthValidationError>>;

export const userRoleSchema = z.enum(["customer", "craftsman"], {
  error: validationErrors.roleInvalid,
});
export type UserRole = z.infer<typeof userRoleSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const loginSchema = z.object({
  email: z
    .string({ error: validationErrors.emailInvalid })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: validationErrors.emailInvalid })),
  password: z
    .string({ error: validationErrors.passwordTooShort })
    .min(8, { error: validationErrors.passwordTooShort })
    .max(128, { error: validationErrors.passwordTooLong }),
});

export const registrationSchema = loginSchema.extend({
  name: z
    .string({ error: validationErrors.nameRequired })
    .trim()
    .min(1, { error: validationErrors.nameRequired })
    .max(100, { error: validationErrors.nameTooLong }),
  role: userRoleSchema,
});

export const getAuthFieldErrors = ({ issues }: z.ZodError) => {
  const fieldErrors: AuthFieldErrors = {};

  for (const { path, message } of issues) {
    const field = authFieldSchema.safeParse(path[0]);
    const error = authValidationErrorSchema.safeParse(message);
    if (!field.success) continue;
    const { data: fieldName } = field;
    fieldErrors[fieldName] ??= error.success ? error.data : validationErrors.invalidValue;
  }

  return fieldErrors;
};

export const meContract = {
  get: oc
    .route({ method: "GET", path: "/me", summary: "Get the signed-in user" })
    .output(sessionUserSchema),
};
