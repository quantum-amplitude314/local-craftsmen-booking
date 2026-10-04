import { oc } from "@orpc/contract";
import { z } from "zod";

const contactValidationErrorSchema = z.enum([
  "invalidValue",
  "nameRequired",
  "nameTooLong",
  "emailInvalid",
  "messageRequired",
  "messageTooLong",
]);
const { enum: validationErrors } = contactValidationErrorSchema;
export type ContactValidationError = z.infer<typeof contactValidationErrorSchema>;

const contactFieldSchema = z.enum(["name", "email", "message"]);
export type ContactField = z.infer<typeof contactFieldSchema>;
export type ContactFieldErrors = Partial<Record<ContactField, ContactValidationError>>;

export const CONTACT_MESSAGE_MAX_LENGTH = 2000;

export const contactMessageSchema = z.object({
  name: z
    .string({ error: validationErrors.nameRequired })
    .trim()
    .min(1, { error: validationErrors.nameRequired })
    .max(100, { error: validationErrors.nameTooLong }),
  email: z
    .string({ error: validationErrors.emailInvalid })
    .trim()
    .max(254, { error: validationErrors.emailInvalid })
    .pipe(z.email({ error: validationErrors.emailInvalid })),
  message: z
    .string({ error: validationErrors.messageRequired })
    .trim()
    .min(1, { error: validationErrors.messageRequired })
    .max(CONTACT_MESSAGE_MAX_LENGTH, { error: validationErrors.messageTooLong }),
});
export type ContactMessage = z.infer<typeof contactMessageSchema>;

/** The visitor's Cloudflare request data, as the web Worker saw it; for debugging local times. */
export const webCfSchema = z.object({
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
});
export type WebCf = z.infer<typeof webCfSchema>;

export const getContactFieldErrors = ({ issues }: z.ZodError) => {
  const fieldErrors: ContactFieldErrors = {};

  for (const { path, message } of issues) {
    const field = contactFieldSchema.safeParse(path[0]);
    const error = contactValidationErrorSchema.safeParse(message);
    if (!field.success) continue;
    const { data: fieldName } = field;
    fieldErrors[fieldName] ??= error.success ? error.data : validationErrors.invalidValue;
  }

  return fieldErrors;
};

export const contactContract = {
  send: oc
    .route({ method: "POST", path: "/contact", summary: "Send a message to the site owner" })
    .input(
      contactMessageSchema.extend({
        captchaToken: z.string().min(1),
        webCf: webCfSchema.optional(),
      }),
    )
    .output(z.object({ sent: z.literal(true) }))
    .errors({ FORBIDDEN: { message: "Security check failed" } }),
};
