import type { ContactMessage, UserRole, WebCf } from "@local-craftsmen/contracts";

export type Mail = { to: string; replyTo?: string; subject: string; text: string };

/** Delivers one mail; the only part that knows the mail provider. */
export type MailTransport = (mail: Mail) => Promise<void>;

type ContactFormMail = ContactMessage & {
  account: { id: string; role: UserRole } | null;
  webCf: WebCf | null;
};

const contactDetails = ({ account, webCf }: Pick<ContactFormMail, "account" | "webCf">) => {
  const labelled = {
    Account: account && `${account.id} (${account.role})`,
    Country: webCf?.country,
    City: webCf?.city,
    "Time zone": webCf?.timezone,
  };
  const lines = Object.entries(labelled)
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  return lines;
};

export const createMailService = ({
  transport,
  contactRecipient,
}: {
  transport: MailTransport;
  contactRecipient: string;
}) => {
  const sendContactFormMail = async ({ name, email, message, account, webCf }: ContactFormMail) => {
    const details = contactDetails({ account, webCf });
    const footer = details.length > 0 ? `\n--\n${details.join("\n")}\n` : "";
    const mail = {
      to: contactRecipient,
      replyTo: email,
      subject: `Contact | ${name}`,
      text: `From: ${name} <${email}>\n\n${message}\n${footer}`,
    };

    await transport(mail);
  };

  const service = { sendContactFormMail };

  return service;
};

export type MailService = ReturnType<typeof createMailService>;
