import {
  type ContactFieldErrors,
  type ContactMessage,
  contactMessageSchema,
  getContactFieldErrors,
  type SessionUser,
} from "@local-craftsmen/contracts";

export type ContactError = "checkFields" | "verificationFailed" | "serviceUnavailable";

export type ContactSender = Pick<SessionUser, "name" | "email">;

export type ContactFeedback = {
  sent: boolean;
  error: ContactError | null;
  fieldErrors?: ContactFieldErrors;
};

/** The same check runs in the browser before sending and in the server action. */
export const validateContactForm = ({ values }: { values: ContactMessage }) => {
  const parsed = contactMessageSchema.safeParse(values);
  const feedback: ContactFeedback = parsed.success
    ? { sent: false, error: null }
    : { sent: false, error: "checkFields", fieldErrors: getContactFieldErrors(parsed.error) };
  const result = { parsed, feedback };

  return result;
};
