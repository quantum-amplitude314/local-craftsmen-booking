"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { logout } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function SignOutButton() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(logout, { error: null });
  const { error } = state;

  return (
    <form action={action} className="flex flex-col items-start gap-2" aria-busy={pending}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="outline" disabled={pending}>
        {t(pending ? "signingOut" : "signOut")}
      </Button>
      <FieldError>{error ? t(`errors.${error}`) : null}</FieldError>
    </form>
  );
}
