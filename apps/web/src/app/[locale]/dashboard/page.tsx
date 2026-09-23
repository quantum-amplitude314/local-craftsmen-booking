import { scheduleDateSchema, type UserRole } from "@local-craftsmen/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CraftsmanDashboard } from "./craftsman-dashboard";
import { CustomerDashboard } from "./customer-dashboard";

const roleDashboards: Record<UserRole, ComponentType<{ day: string | undefined }>> = {
  customer: CustomerDashboard,
  craftsman: CraftsmanDashboard,
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("dashboard");
  const metadata = { title: t("title") };

  return metadata;
};

export default async function DashboardPage({ searchParams }: PageProps<"/[locale]/dashboard">) {
  const [user, locale, t, { day }] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("dashboard"),
    searchParams,
  ]);
  const requestedDay = scheduleDateSchema.safeParse(day);
  if (!user) return redirect({ href: "/login", locale });
  const { name, role } = user;
  const RoleDashboard = roleDashboards[role];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="dashboard-shell flex flex-col gap-8 py-8 sm:py-10"
    >
      <PageBreadcrumbs current="dashboard" />
      <div className="flex min-w-0 flex-col gap-4">
        <h1 className="page-heading">{t("heading")}</h1>
        <p className="wrap-anywhere text-muted-foreground">{t("welcome", { name })}</p>
      </div>
      <RoleDashboard day={requestedDay.success ? requestedDay.data : undefined} />
    </main>
  );
}
