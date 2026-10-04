"use server";

import { type ContactMessage, webCfSchema } from "@local-craftsmen/contracts";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ORPCError } from "@orpc/client";
import { apiClient } from "@/lib/api";
import { type ContactFeedback, validateContactForm } from "@/lib/contact-form";

/** The visitor's request data as this Worker saw it; the API only sees the web Worker's call. */
const readWebCf = async () => {
  const { cf } = await getCloudflareContext({ async: true });
  const parsed = webCfSchema.safeParse(cf);
  const webCf = parsed.success ? parsed.data : undefined;

  return webCf;
};

export const sendContactMessage = async ({
  values,
  captchaToken,
}: {
  values: ContactMessage;
  captchaToken: string | null;
}): Promise<ContactFeedback> => {
  const { parsed, feedback } = validateContactForm({ values });
  if (!parsed.success) return feedback;
  if (!captchaToken) {
    const unverified: ContactFeedback = { sent: false, error: "verificationFailed" };

    return unverified;
  }

  try {
    await apiClient.contact.send({ ...parsed.data, captchaToken, webCf: await readWebCf() });
  } catch (error) {
    const refused = error instanceof ORPCError && error.code === "FORBIDDEN";
    const failed: ContactFeedback = {
      sent: false,
      error: refused ? "verificationFailed" : "serviceUnavailable",
    };

    return failed;
  }

  const sent: ContactFeedback = { sent: true, error: null };

  return sent;
};
