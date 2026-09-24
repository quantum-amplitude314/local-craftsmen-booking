import "server-only";

import type { Area, CityId } from "@local-craftsmen/contracts";
import { getAvailabilityDay } from "@/lib/availability-day";
import { getMonthBookings } from "@/lib/month-bookings";

/**
 * What the dashboard URL says the craftsman is looking at. The planner and the bookings calendar
 * keep separate days: they are two clocks, and reading a job must not move the planner.
 */
export type ScheduleParams = {
  day: string | undefined;
  cityId: CityId | undefined;
  jobDay: string | undefined;
};

export const getDashboardSchedules = async ({
  day,
  cityId,
  jobDay,
  baseArea,
}: ScheduleParams & { baseArea: Area }) => {
  const [availability, bookings] = await Promise.all([
    getAvailabilityDay({ day, cityId, baseArea }),
    getMonthBookings({ day: jobDay }),
  ]);
  const schedules = { availability, bookings };

  return schedules;
};
