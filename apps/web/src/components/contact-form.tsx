"use client";

import { CONTACT_MESSAGE_MAX_LENGTH, type ContactField } from "@local-craftsmen/contracts";
import { cn } from "cn";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { type SubmitEvent, useEffect, useRef, useState, useTransition } from "react";
import { sendContactMessage } from "@/app/contact-actions";
import { useContactCloseHref } from "@/components/contact-dialog";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button, buttonVariants } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { type ContactFeedback, type ContactSender, validateContactForm } from "@/lib/contact-form";
import { useGoBack } from "@/lib/use-go-back";

function ContactExit({
  variant,
  className,
  children,
}: {
  variant: "default" | "ghost";
  className?: string;
  children: React.ReactNode;
}) {
  const closeHref = useContactCloseHref();
  const goBack = useGoBack({ fallback: "/" });

  if (closeHref) {
    return (
      <Link
        href={closeHref}
        scroll={false}
        className={cn(buttonVariants({ variant, size: "lg" }), className)}
      >
        {children}
      </Link>
    );
  }

  return (
    <Button type="button" variant={variant} size="lg" className={className} onClick={goBack}>
      {children}
    </Button>
  );
}

export function ContactForm({ sender }: { sender: ContactSender | null }) {
  const t = useTranslations("contact");
  const inDialog = useContactCloseHref() !== null;
  const Heading = inDialog ? DialogTitle : "h1";
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
        <Heading
          ref={sentHeadingRef}
          tabIndex={-1}
          className={cn("flex items-center gap-3", !inDialog && "page-heading")}
        >
          <CircleCheck aria-hidden="true" className="size-10 shrink-0 text-primary" />
          {t("sentHeading")}
        </Heading>
        <p className="body-lead text-muted-foreground">{t("sent")}</p>
        <ContactExit variant="default">
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          {t("back")}
        </ContactExit>
      </div>
    );
  }

  return (
    <>
      <Heading className={cn(!inDialog && "page-heading mb-10")}>{t("heading")}</Heading>
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
        <Field orientation="horizontal">
          <ContactExit variant="ghost" className="flex-1">
            {t("cancel")}
          </ContactExit>
          <Button type="submit" size="lg" className="flex-1" disabled={pending || !captchaToken}>
            {t(pending ? "pending" : "send")}
          </Button>
        </Field>
      </form>
    </>
  );
}

/** The form's shape while the session decides whether the sender is filled in. */
export function ContactFormSkeleton() {
  const t = useTranslations("shell");

  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <Skeleton className="mb-4 h-10 w-56" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-36" />
    </div>
  );
}
