"use client";

import { CONTACT_MESSAGE_MAX_LENGTH, type ContactField } from "@local-craftsmen/contracts";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { type SubmitEvent, useEffect, useRef, useState, useTransition } from "react";
import { sendContactMessage } from "@/app/contact-actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { type ContactFeedback, type ContactSender, validateContactForm } from "@/lib/contact-form";

/** A signed-in sender sees their name and email locked; the API takes both from the session. */
export function ContactForm({ sender }: { sender: ContactSender | null }) {
  const t = useTranslations("contact");
  const router = useRouter();
  const [feedback, setFeedback] = useState<ContactFeedback>({ sent: false, error: null });
  const [pending, startTransition] = useTransition();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const { sent, error, fieldErrors } = feedback;

  const getFieldError = (field: ContactField) => {
    const key = fieldErrors?.[field];
    const message = key ? t(`validation.${key}`) : undefined;

    return message;
  };
  const nameError = getFieldError("name");
  const emailError = getFieldError("email");
  const messageError = getFieldError("message");

  useEffect(() => {
    if (!feedback.error) return;
    const { current: form } = formRef;
    const target =
      form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form?.querySelector<HTMLElement>("#contact-error");
    target?.focus();
  }, [feedback]);

  useEffect(() => {
    if (sent) sentHeadingRef.current?.focus();
  }, [sent]);

  // Opened in a new tab, the page has no history to return to.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push("/"));

  // Updates state only while there is an error to clear, so typing does not re-render the form.
  const clearFieldError = (field: ContactField) => {
    if (!error && !fieldErrors?.[field]) return;
    setFeedback(({ fieldErrors: current }) => {
      const { [field]: _edited, ...rest } = current ?? {};

      return { sent: false, error: null, fieldErrors: rest };
    });
  };

  const readValues = () => {
    const values = {
      name: sender?.name ?? nameRef.current?.value ?? "",
      email: sender?.email ?? emailRef.current?.value ?? "",
      message: messageRef.current?.value ?? "",
    };

    return values;
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = readValues();
    const { parsed, feedback: validation } = validateContactForm({ values });
    if (!parsed.success) return setFeedback(validation);

    startTransition(async () => {
      const answer = await sendContactMessage({ values, captchaToken });
      setFeedback(answer);
      // A Turnstile token is single-use, so every server answer needs a fresh challenge.
      setChallengeKey((key) => key + 1);
    });
  };

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-6">
        <h1 ref={sentHeadingRef} tabIndex={-1} className="page-heading flex items-center gap-3">
          <CircleCheck aria-hidden="true" className="size-10 shrink-0 text-primary" />
          {t("sentHeading")}
        </h1>
        <p className="body-lead text-muted-foreground">{t("sent")}</p>
        <Button size="lg" onClick={goBack}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          {t("back")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-heading mb-10">{t("heading")}</h1>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-8"
        aria-busy={pending}
      >
        <FieldGroup>
          <Field data-disabled={!!sender} data-invalid={!!nameError}>
            <FieldLabel htmlFor="contact-name">{t("name")}</FieldLabel>
            <Input
              ref={nameRef}
              id="contact-name"
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              defaultValue={sender?.name}
              disabled={!!sender}
              readOnly={pending}
              onChange={() => clearFieldError("name")}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "contact-name-error" : undefined}
            />
            <FieldError id="contact-name-error">{nameError}</FieldError>
          </Field>
          <Field data-disabled={!!sender} data-invalid={!!emailError}>
            <FieldLabel htmlFor="contact-email">{t("email")}</FieldLabel>
            <Input
              ref={emailRef}
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={sender?.email}
              disabled={!!sender}
              readOnly={pending}
              onChange={() => clearFieldError("email")}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "contact-email-error" : undefined}
            />
            <FieldError id="contact-email-error">{emailError}</FieldError>
          </Field>
          <Field data-invalid={!!messageError}>
            <FieldLabel htmlFor="contact-message">{t("message")}</FieldLabel>
            <Textarea
              ref={messageRef}
              id="contact-message"
              name="message"
              required
              maxLength={CONTACT_MESSAGE_MAX_LENGTH}
              readOnly={pending}
              onChange={() => clearFieldError("message")}
              aria-invalid={!!messageError}
              aria-describedby={
                messageError ? "contact-message-hint contact-message-error" : "contact-message-hint"
              }
            />
            <FieldDescription id="contact-message-hint">
              {t("messageHint", { limit: CONTACT_MESSAGE_MAX_LENGTH })}
            </FieldDescription>
            <FieldError id="contact-message-error">{messageError}</FieldError>
          </Field>
        </FieldGroup>
        <TurnstileWidget key={challengeKey} onTokenChange={setCaptchaToken} />
        <FieldError id="contact-error" tabIndex={-1}>
          {error && !pending ? t(`errors.${error}`) : null}
        </FieldError>
        <Button type="submit" size="lg" disabled={pending || !captchaToken}>
          {t(pending ? "pending" : "send")}
        </Button>
      </form>
    </>
  );
}
