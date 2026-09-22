"use client";

import { type UserRole, userRoleSchema } from "@local-craftsmen/contracts";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register } from "@/app/auth-actions";
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
import type { AuthFormState } from "@/lib/auth-form-state";

const initialState: AuthFormState = { error: null };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegistration = mode === "register";
  const [role, setRole] = useState<UserRole>("customer");
  const [state, formAction, pending] = useActionState(
    isRegistration ? register : login,
    initialState,
  );
  const { error, fieldErrors, values } = state;

  return (
    <form action={formAction} className="flex flex-col gap-8" aria-busy={pending}>
      <FieldGroup>
        {isRegistration ? (
          <>
            <FieldSet>
              <FieldLegend variant="label" id="account-role">
                I want to
              </FieldLegend>
              <ToggleGroup
                aria-labelledby="account-role"
                className="flex-wrap"
                variant="outline"
                value={[role]}
                onValueChange={(selected) => {
                  const result = userRoleSchema.safeParse(selected[0]);
                  if (result.success) setRole(result.data);
                }}
                disabled={pending}
              >
                <ToggleGroupItem value="customer">Find a craftsman</ToggleGroupItem>
                <ToggleGroupItem value="craftsman">Offer my services</ToggleGroupItem>
              </ToggleGroup>
              <input type="hidden" name="role" value={role} />
              <FieldDescription>Your account type is set when you register.</FieldDescription>
              <FieldError>{fieldErrors?.role}</FieldError>
            </FieldSet>
            <Field data-invalid={!!fieldErrors?.name}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                defaultValue={values?.name}
                aria-invalid={!!fieldErrors?.name}
                aria-describedby="name-error"
              />
              <FieldError id="name-error">{fieldErrors?.name}</FieldError>
            </Field>
          </>
        ) : null}
        <Field data-invalid={!!fieldErrors?.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={values?.email}
            aria-invalid={!!fieldErrors?.email}
            aria-describedby="email-error"
          />
          <FieldError id="email-error">{fieldErrors?.email}</FieldError>
        </Field>
        <Field data-invalid={!!fieldErrors?.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegistration ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={128}
            aria-invalid={!!fieldErrors?.password}
            aria-describedby="password-hint password-error"
          />
          <FieldDescription id="password-hint">Use 8–128 characters.</FieldDescription>
          <FieldError id="password-error">{fieldErrors?.password}</FieldError>
        </Field>
      </FieldGroup>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Please wait…" : isRegistration ? "Create account" : "Sign in"}
      </Button>
      <p className="text-sm text-muted-foreground">
        {isRegistration ? "Already have an account? " : "New to Local Craftsmen? "}
        <Link
          href={isRegistration ? "/login" : "/register"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isRegistration ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
