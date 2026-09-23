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

export async function SiteHeader() {
  const t = await getTranslations("header");

  return (
    <header className="dashboard-shell flex min-h-20 flex-wrap items-center gap-x-4 gap-y-2 border-b py-3">
      <Link
        href="/"
        aria-label={t("home")}
        className="inline-flex min-h-10 items-center text-sm font-semibold tracking-tight"
      >
        LOCAL <span className="px-1 text-primary">/</span> CRAFT
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
