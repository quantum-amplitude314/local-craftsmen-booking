import "server-only";

import {
  type CityId,
  type Craft,
  cityIdSchema,
  craftSchema,
  scheduleDateSchema,
} from "@local-craftsmen/contracts";

/** The dashboard URL; the schedule and the bookings calendar each keep their own day. */
export type ScheduleParams = {
  day: string | undefined;
  cityId: CityId | undefined;
  /** The customer's offer filters; the planner has no use for them. */
  craft: Craft | undefined;
  districtId: string | undefined;
  jobDay: string | undefined;
};

export type DashboardSearchParams = PageProps<"/[locale]/dashboard">["searchParams"];

/** An unreadable value counts as absent, and each schedule falls back to its own default. */
export const readScheduleParams = async (searchParams: DashboardSearchParams) => {
  const { day, city, craft, district, jobDay } = await searchParams;
  const requestedDay = scheduleDateSchema.safeParse(day);
  const requestedCity = cityIdSchema.safeParse(city);
  const requestedCraft = craftSchema.safeParse(craft);
  const requestedJobDay = scheduleDateSchema.safeParse(jobDay);
  const params: ScheduleParams = {
    day: requestedDay.success ? requestedDay.data : undefined,
    cityId: requestedCity.success ? requestedCity.data : undefined,
    craft: requestedCraft.success ? requestedCraft.data : undefined,
    districtId: typeof district === "string" && district ? district : undefined,
    jobDay: requestedJobDay.success ? requestedJobDay.data : undefined,
  };

  return params;
};
