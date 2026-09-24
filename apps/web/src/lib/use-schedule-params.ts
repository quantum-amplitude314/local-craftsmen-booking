"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * The planned day and city live in the URL because both change the schedule the server reads: the
 * city decides the time zone the hours are counted in, so picking one has to refetch the day.
 * Navigation keeps the rest of the dashboard query intact.
 */
export const useScheduleParams = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [changing, startChange] = useTransition();

  const navigate = (patch: Record<string, string>) =>
    startChange(() =>
      router.replace(
        { pathname: "/dashboard", query: { ...Object.fromEntries(searchParams), ...patch } },
        { scroll: false },
      ),
    );
  const scheduleParams = {
    changing,
    selectDay: (date: string) => navigate({ day: date }),
    selectCity: (cityId: string) => navigate({ city: cityId }),
    /** Bookings keep their own day: reading a job's date must not move the planner. */
    selectJobDay: (date: string) => navigate({ jobDay: date }),
  };

  return scheduleParams;
};
