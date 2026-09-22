"use client";

import { useLocale } from "next-intl";
import { useActionState } from "react";
import { logout } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function SignOutButton() {
  const locale = useLocale();
  const [state, action, pending] = useActionState(logout, { error: null });

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      <FieldError>{state.error}</FieldError>
    </form>
  );
}
