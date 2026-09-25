import "server-only";

import type { Area, CityId, Craft } from "@local-craftsmen/contracts";
import { getAvailabilityDay } from "@/lib/availability-day";
import { getMonthBookings } from "@/lib/month-bookings";

/**
 * What the dashboard URL says its reader is looking at: the craftsman's planner or the customer's
 * offer on the left, bookings on the right. The two keep separate days: they are two clocks, and
 * reading a job must not move the other side.
 */
export type ScheduleParams = {
  day: string | undefined;
  cityId: CityId | undefined;
  /** The customer's offer filters; the planner has no use for them. */
  craft: Craft | undefined;
  districtId: string | undefined;
  jobDay: string | undefined;
};

export const getDashboardSchedules = async ({
  day,
  cityId,
  jobDay,
  baseArea,
}: Pick<ScheduleParams, "day" | "cityId" | "jobDay"> & { baseArea: Area }) => {
  const [availability, bookings] = await Promise.all([
    getAvailabilityDay({ day, cityId, baseArea }),
    getMonthBookings({ day: jobDay }),
  ]);
  const schedules = { availability, bookings };

  return schedules;
};
