import { cityIdSchema, scheduleDateSchema, type UserRole } from "@local-craftsmen/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { ScheduleParams } from "@/lib/dashboard-schedules";
import { CraftsmanDashboard } from "./craftsman-dashboard";
import { CustomerDashboard } from "./customer-dashboard";

const roleDashboards: Record<UserRole, ComponentType<ScheduleParams>> = {
  customer: CustomerDashboard,
  craftsman: CraftsmanDashboard,
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("dashboard");
  const metadata = { title: t("title") };

  return metadata;
};

export default async function DashboardPage({ searchParams }: PageProps<"/[locale]/dashboard">) {
  const [user, locale, t, { day, city, jobDay }] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("dashboard"),
    searchParams,
  ]);
  // An unreadable day or city is planned as if it were absent, in the craftsman's own city today.
  const requestedDay = scheduleDateSchema.safeParse(day);
  const requestedCity = cityIdSchema.safeParse(city);
  const requestedJobDay = scheduleDateSchema.safeParse(jobDay);
  if (!user) return redirect({ href: "/login", locale });
  const { name, role } = user;
  const RoleDashboard = roleDashboards[role];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="dashboard-shell flex flex-col gap-6 py-4 sm:py-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <PageBreadcrumbs current="dashboard" />
        <h1 className="wrap-anywhere text-muted-foreground">{t("welcome", { name })}</h1>
      </div>
      <RoleDashboard
        day={requestedDay.success ? requestedDay.data : undefined}
        cityId={requestedCity.success ? requestedCity.data : undefined}
        jobDay={requestedJobDay.success ? requestedJobDay.data : undefined}
      />
    </main>
  );
}
