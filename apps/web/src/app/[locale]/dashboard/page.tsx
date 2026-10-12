import type { UserRole } from "@local-craftsmen/contracts";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type ComponentType, Suspense } from "react";
import { BookingHistoryButton } from "@/components/booking-history-button";
import { SectionError } from "@/components/section-error";
import { SessionGate } from "@/components/session-gate";
import { getCurrentUser } from "@/lib/auth";
import {
  type DashboardSearchParams,
  readScheduleParams,
  type ScheduleParams,
} from "@/lib/dashboard-schedules";
import { BookingsCalendar } from "./bookings-calendar";
import { CraftsmanSchedule } from "./craftsman-schedule";
import { CustomerSchedule } from "./customer-schedule";
import { CalendarSkeleton, GreetingSkeleton, ScheduleSkeleton } from "./skeletons";

const roleSchedules: Record<UserRole, ComponentType<ScheduleParams>> = {
  customer: CustomerSchedule,
  craftsman: CraftsmanSchedule,
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("dashboard");
  const metadata = { title: t("title") };

  return metadata;
};

async function Greeting() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("dashboard")]);

  return user ? (
    <h1 className="min-w-0 wrap-anywhere text-muted-foreground">
      {t("welcome", { name: user.name })}
    </h1>
  ) : null;
}

async function RoleSchedule({ searchParams }: { searchParams: DashboardSearchParams }) {
  const [user, params] = await Promise.all([getCurrentUser(), readScheduleParams(searchParams)]);
  if (!user) return null;
  const Schedule = roleSchedules[user.role];

  return <Schedule {...params} />;
}

export default async function DashboardPage({ searchParams }: PageProps<"/[locale]/dashboard">) {
  const t = await getTranslations("dashboard");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="dashboard-shell flex flex-col gap-6 py-4 sm:py-6"
    >
      <Suspense fallback={null}>
        <SessionGate />
      </Suspense>
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>
      <div className="flex flex-col gap-10 xl:flex-row xl:items-start">
        <div className="w-full min-w-0 max-w-172 flex-1">
          <SectionError>
            <Suspense fallback={<ScheduleSkeleton />}>
              <RoleSchedule searchParams={searchParams} />
            </Suspense>
          </SectionError>
        </div>
        <section
          className="flex w-full min-w-0 max-w-172 flex-1 flex-col gap-6 border-t pt-6"
          aria-labelledby="bookings-heading"
        >
          <div className="flex min-w-0 items-center justify-between gap-4">
            <h2 id="bookings-heading" className="section-heading">
              {t("sections.bookings")}
            </h2>
            <BookingHistoryButton />
          </div>
          <SectionError>
            <Suspense fallback={<CalendarSkeleton />}>
              <BookingsCalendar searchParams={searchParams} />
            </Suspense>
          </SectionError>
        </section>
      </div>
    </main>
  );
}
