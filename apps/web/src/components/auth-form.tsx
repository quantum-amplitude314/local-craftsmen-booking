"use client";

import { type AuthField, type UserRole, userRoleSchema } from "@local-craftsmen/contracts";
import { useLocale, useTranslations } from "next-intl";
import { type SubmitEvent, useActionState, useEffect, useRef, useState } from "react";
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
import type { AuthFormState } from "@/lib/auth-form-state";
import { validateAuthForm } from "@/lib/auth-form-validation";

const initialState: AuthFormState = { error: null };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const isRegistration = mode === "register";
  const [state, formAction, pending] = useActionState(
    isRegistration ? register : login,
    initialState,
  );
  const { values } = state;
  const [role, setRole] = useState<UserRole>(values?.role ?? "customer");
  const [clientState, setClientState] = useState<AuthFormState | null>(null);
  const [editedFields, setEditedFields] = useState<AuthField[]>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const [answeredState, setAnsweredState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  // A Turnstile token is single-use, so every server answer needs a fresh challenge.
  if (state !== answeredState) {
    setAnsweredState(state);
    setChallengeKey((key) => key + 1);
  }
  const { error, fieldErrors } = clientState ?? state;
  const visibleError = !pending && editedFields.length === 0 ? error : null;

  const getFieldError = (field: AuthField) => {
    const key = !pending && !editedFields.includes(field) ? fieldErrors?.[field] : undefined;
    const message = key ? t(`validation.${key}`) : undefined;

    return message;
  };
  const nameError = getFieldError("name");
  const emailError = getFieldError("email");
  const passwordError = getFieldError("password");
  const roleError = getFieldError("role");

  useEffect(() => {
    const { error } = clientState ?? state;
    if (pending || !error) return;
    const { current: form } = formRef;
    const target =
      form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form?.querySelector<HTMLElement>("#auth-error");
    target?.focus();
  }, [clientState, state, pending]);

  const clearFieldError = (field: AuthField) => {
    setEditedFields((current) => (current.includes(field) ? current : [...current, field]));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    const { currentTarget: form } = event;
    const { parsed, state: validationState } = validateAuthForm({
      formData: new FormData(form),
      mode,
    });
    setEditedFields([]);
    setClientState(parsed.success ? null : validationState);
    if (!parsed.success) event.preventDefault();
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-8"
      aria-busy={pending}
    >
      <input type="hidden" name="locale" value={locale} />
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
                  if (result.success) {
                    setRole(result.data);
                    clearFieldError("role");
                  }
                }}
                disabled={pending}
              >
                <ToggleGroupItem value="customer">{t("customer")}</ToggleGroupItem>
                <ToggleGroupItem value="craftsman">{t("craftsman")}</ToggleGroupItem>
              </ToggleGroup>
              <input type="hidden" name="role" value={role} />
              <FieldDescription id="role-hint">{t("roleHint")}</FieldDescription>
              <FieldError id="role-error">{roleError}</FieldError>
            </FieldSet>
            <Field data-invalid={!!nameError}>
              <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                defaultValue={values?.name}
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
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={values?.email}
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
        {visibleError ? t(`errors.${visibleError}`) : null}
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
