"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * The planned day and city live in the URL because both change the schedule the server reads: the
 * city decides the time zone the hours are counted in, so picking one has to refetch the day. The
 * customer's offer filters live there for the same reason. Navigation stays on the current page and
 * keeps the rest of its query intact; an emptied value leaves the address bar.
 */
export const useScheduleParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [changing, startChange] = useTransition();

  const navigate = (patch: Record<string, string>) => {
    const query = Object.fromEntries(
      Object.entries({ ...Object.fromEntries(searchParams), ...patch }).filter(
        ([, value]) => value !== "",
      ),
    );
    startChange(() => router.replace({ pathname, query }, { scroll: false }));
  };
  const scheduleParams = {
    changing,
    selectDay: (date: string) => navigate({ day: date }),
    /** A district belongs to one city, so choosing another city drops it. */
    selectCity: (cityId: string) => navigate({ city: cityId, district: "" }),
    selectCraft: (craft: string) => navigate({ craft }),
    selectDistrict: (districtId: string) => navigate({ district: districtId }),
    /** Bookings keep their own day: reading a job's date must not move the planner. */
    selectJobDay: (date: string) => navigate({ jobDay: date }),
  };

  return scheduleParams;
};
