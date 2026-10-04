import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AccountMenu } from "@/components/account-menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PaletteToggle } from "@/components/palette-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

async function AccountNavigation() {
  const [user, t] = await Promise.all([
    getCurrentUser().catch(() => null),
    getTranslations("header"),
  ]);

  return user ? (
    <div className="ml-auto flex items-center gap-2 sm:gap-3">
      <nav aria-label={t("accountNavigation")}>
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          {t("dashboard")}
        </Link>
      </nav>
      <PaletteToggle />
      <AccountMenu user={user} />
    </div>
  ) : (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      <LocaleSwitcher />
      <PaletteToggle />
      <nav aria-label={t("accountNavigation")} className="flex items-center gap-2">
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          {t("signIn")}
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "outline" })}>
          {t("createAccount")}
        </Link>
      </nav>
    </div>
  );
}

/** Copy of public/icon.svg; the --brand-mark-* tokens colour it for the current palette. */
function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="size-8 shrink-0">
      <rect width="64" height="64" rx="14" className="fill-(--brand-mark-tile)" />
      <g fill="none" strokeWidth="3.5" className="stroke-(--brand-mark-line)">
        <rect x="13.75" y="13.75" width="13.5" height="13.5" rx="2" />
        <rect x="36.75" y="13.75" width="13.5" height="13.5" rx="2" />
        <rect x="13.75" y="36.75" width="13.5" height="13.5" rx="2" />
      </g>
      <rect x="35" y="35" width="17" height="17" rx="3" className="fill-(--brand-mark-accent)" />
    </svg>
  );
}

export async function SiteHeader() {
  const [t, shell] = await Promise.all([getTranslations("header"), getTranslations("shell")]);

  return (
    <header className="dashboard-shell flex min-h-20 flex-wrap items-center gap-x-4 gap-y-2 border-b py-3">
      <Link href="/" aria-label={t("home")} className="inline-flex min-h-10 items-center gap-2.5">
        <BrandMark />
        <span className="wordmark">{shell("brand")}</span>
      </Link>
      <Suspense
        fallback={
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "lg", className: "ml-auto" })}
          >
            {t("myAccount")}
          </Link>
        }
      >
        <AccountNavigation />
      </Suspense>
    </header>
  );
}
