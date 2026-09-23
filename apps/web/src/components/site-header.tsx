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
    <AccountMenu user={user} />
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
        {t("signIn")}
      </Link>
      <Link href="/register" className={buttonVariants({ variant: "outline" })}>
        {t("createAccount")}
      </Link>
    </div>
  );
}

export async function SiteHeader() {
  const t = await getTranslations("header");

  return (
    <header className="page-shell flex min-h-24 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b py-5">
      <Link href="/" aria-label={t("home")} className="text-sm font-semibold tracking-tight">
        LOCAL <span className="px-1 text-primary">/</span> CRAFT
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label={t("accountNavigation")}>
          <Suspense
            fallback={
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                {t("myAccount")}
              </Link>
            }
          >
            <AccountNavigation />
          </Suspense>
        </nav>
        <LocaleSwitcher />
        <PaletteToggle />
      </div>
    </header>
  );
}
