"use client";

import { type SessionUser, userRoleSchema } from "@local-craftsmen/contracts";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { startTransition, useActionState } from "react";
import { logout } from "@/app/auth-actions";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";

export function AccountMenu({ user }: { user: Pick<SessionUser, "name" | "email" | "role"> }) {
  const locale = useLocale();
  const t = useTranslations("header");
  const tAuth = useTranslations("auth");
  const [state, signOut, pending] = useActionState(logout, { error: null });
  const { error } = state;
  const { name, email, role } = user;

  const handleSignOut = () => {
    const formData = new FormData();
    formData.set("locale", locale);
    startTransition(() => signOut(formData));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}>
        {t("myAccount")}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56 max-w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm text-foreground">{name}</span>
            <span className="truncate font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem render={<Link href="/dashboard" />}>
          {t("dashboard")}
        </DropdownMenuLinkItem>
        {role === userRoleSchema.enum.craftsman && (
          <DropdownMenuLinkItem render={<Link href="/profile" />}>
            {t("profile")}
          </DropdownMenuLinkItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem closeOnClick={false} disabled={pending} onClick={handleSignOut}>
          {tAuth(pending ? "signingOut" : "signOut")}
        </DropdownMenuItem>
        {error && (
          <p role="alert" className="max-w-56 px-2 py-1.5 text-xs text-destructive">
            {tAuth(`errors.${error}`)}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
