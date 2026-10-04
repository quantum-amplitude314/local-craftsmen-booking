import type { MailTransport } from "@local-craftsmen/application";

const resendEndpoint = "https://api.resend.com/emails";
const deliveryTimeoutMs = 5_000;

export const createResendTransport =
  ({ apiKey, from }: { apiKey: string; from: string }): MailTransport =>
  async ({ to, replyTo, subject, text }) => {
    const response = await fetch(resendEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, reply_to: replyTo, subject, text }),
      signal: AbortSignal.timeout(deliveryTimeoutMs),
    });
    if (!response.ok)
      throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
  };

export const consoleTransport: MailTransport = async (mail) => {
  console.debug(JSON.stringify({ message: "Mail logged, not sent", mail }));
};
