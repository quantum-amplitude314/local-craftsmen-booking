import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("dashboard");
  const metadata = { title: t("title") };

  return metadata;
};

export default async function DashboardPage() {
  const [user, locale, t] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("dashboard"),
  ]);
  if (!user) return redirect({ href: "/login", locale });
  const { name, email, role } = user;

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="eyebrow text-primary">{t(`roles.${role}`)}</p>
          <h1 className="page-heading wrap-anywhere">{t("welcome", { name })}</h1>
          <p className="wrap-anywhere text-muted-foreground">{email}</p>
        </div>
        <SignOutButton />
      </div>
      <p className="body-lead max-w-xl text-muted-foreground">{t(`ready.${role}`)}</p>
      <div>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t("browse")}
        </Link>
      </div>
    </main>
  );
}
