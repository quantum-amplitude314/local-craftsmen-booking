"use client";

import { type SessionUser, userRoleSchema } from "@local-craftsmen/contracts";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { logout } from "@/app/auth-actions";
import { LocaleMenu } from "@/components/locale-switcher";
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
import type { AuthError } from "@/lib/auth-form-state";

export function AccountMenu({
  user,
  deployedVersion,
}: {
  user: Pick<SessionUser, "name" | "email" | "role">;
  deployedVersion: string;
}) {
  const locale = useLocale();
  const t = useTranslations("header");
  const tAuth = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthError | null>(null);
  const { name, email, role } = user;

  const handleSignOut = () => {
    startTransition(async () => {
      const { error: failure } = await logout({ locale });
      setError(failure);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "lg" })}>
        {t("myAccount")}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm text-foreground">{name}</span>
            <span className="truncate font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {role === userRoleSchema.enum.craftsman && (
            <DropdownMenuLinkItem render={<Link href="/profile" />}>
              {t("profile")}
            </DropdownMenuLinkItem>
          )}
          <LocaleMenu />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem closeOnClick={false} disabled={pending} onClick={handleSignOut}>
            {tAuth(pending ? "signingOut" : "signOut")}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {deployedVersion}
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {error && (
          <p role="alert" className="max-w-56 px-2 py-1.5 text-xs text-destructive">
            {tAuth(`errors.${error}`)}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
