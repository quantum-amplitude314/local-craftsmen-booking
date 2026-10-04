"use client";

import { type AuthField, type UserRole, userRoleSchema } from "@local-craftsmen/contracts";
import { useLocale, useTranslations } from "next-intl";
import { type SubmitEvent, useEffect, useRef, useState, useTransition } from "react";
import { login, register } from "@/app/auth-actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Link } from "@/i18n/navigation";
import type { AuthFeedback, AuthMode, AuthValues } from "@/lib/auth-form-state";
import { validateAuthForm } from "@/lib/auth-form-validation";

export function AuthForm({
  mode,
  initialRole = userRoleSchema.enum.customer,
}: {
  mode: AuthMode;
  initialRole?: UserRole;
}) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const isRegistration = mode === "register";
  const [role, setRole] = useState<UserRole>(initialRole);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<AuthFeedback>({ error: null });
  const [pending, startTransition] = useTransition();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const { error, fieldErrors } = feedback;

  const getFieldError = (field: AuthField) => {
    const key = fieldErrors?.[field];
    const message = key ? t(`validation.${key}`) : undefined;

    return message;
  };
  const nameError = getFieldError("name");
  const emailError = getFieldError("email");
  const passwordError = getFieldError("password");
  const roleError = getFieldError("role");

  useEffect(() => {
    if (!feedback.error) return;
    const { current: form } = formRef;
    const target =
      form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form?.querySelector<HTMLElement>("#auth-error");
    target?.focus();
  }, [feedback]);

  // Updates state only while there is an error to clear, so typing does not re-render the form.
  const clearFieldError = (field: AuthField) => {
    if (!error && !fieldErrors?.[field]) return;
    setFeedback(({ fieldErrors: current }) => {
      const { [field]: _edited, ...rest } = current ?? {};

      return { error: null, fieldErrors: rest };
    });
  };

  const readValues = () => {
    const values: AuthValues = {
      name: nameRef.current?.value ?? "",
      email: emailRef.current?.value ?? "",
      password: passwordRef.current?.value ?? "",
      role,
    };

    return values;
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = readValues();
    const { parsed, feedback: validation } = validateAuthForm({ values, mode });
    if (!parsed.success) return setFeedback(validation);

    startTransition(async () => {
      const send = isRegistration ? register : login;
      const answer = await send({ values, captchaToken, locale });
      setFeedback(answer);
      // A Turnstile token is single-use, so every server answer needs a fresh challenge.
      setChallengeKey((key) => key + 1);
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-8"
      aria-busy={pending}
    >
      <FieldGroup>
        {isRegistration ? (
          <>
            <FieldSet data-invalid={!!roleError}>
              <FieldLegend variant="label" id="account-role">
                {t("role")}
              </FieldLegend>
              <ToggleGroup
                aria-labelledby="account-role"
                aria-describedby={roleError ? "role-hint role-error" : "role-hint"}
                aria-invalid={!!roleError}
                tabIndex={-1}
                className="flex-wrap"
                variant="outline"
                value={[role]}
                onValueChange={(selected) => {
                  const result = userRoleSchema.safeParse(selected[0]);
                  if (!result.success) return;
                  setRole(result.data);
                  clearFieldError("role");
                }}
                disabled={pending}
              >
                {userRoleSchema.options.map((option) => (
                  <ToggleGroupItem key={option} value={option}>
                    {t(option)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription id="role-hint">{t("roleHint")}</FieldDescription>
              <FieldError id="role-error">{roleError}</FieldError>
            </FieldSet>
            <Field data-invalid={!!nameError}>
              <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
              <Input
                ref={nameRef}
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                readOnly={pending}
                onChange={() => clearFieldError("name")}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              <FieldError id="name-error">{nameError}</FieldError>
            </Field>
          </>
        ) : null}
        <Field data-invalid={!!emailError}>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            readOnly={pending}
            onChange={() => clearFieldError("email")}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          <FieldError id="email-error">{emailError}</FieldError>
        </Field>
        <Field data-invalid={!!passwordError}>
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            autoComplete={isRegistration ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={128}
            readOnly={pending}
            onChange={() => clearFieldError("password")}
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "password-hint password-error" : "password-hint"}
          />
          <FieldDescription id="password-hint">{t("passwordHint")}</FieldDescription>
          <FieldError id="password-error">{passwordError}</FieldError>
        </Field>
      </FieldGroup>
      <TurnstileWidget key={challengeKey} onTokenChange={setCaptchaToken} />
      <FieldError id="auth-error" tabIndex={-1}>
        {error && !pending ? t(`errors.${error}`) : null}
      </FieldError>
      <Button type="submit" size="lg" disabled={pending || !captchaToken}>
        {t(pending ? "pending" : isRegistration ? "createAccount" : "signIn")}
      </Button>
      <p className="text-sm text-muted-foreground">
        {t.rich(isRegistration ? "registerPrompt" : "loginPrompt", {
          link: (chunks) => (
            <Link
              href={isRegistration ? "/login" : "/register"}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
