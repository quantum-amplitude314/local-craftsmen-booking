import { cityIdSchema } from "@local-craftsmen/contracts";
import { city, craftsmanProfile, type Db } from "@local-craftsmen/db";
import { eq, sql } from "drizzle-orm";
import { DomainError } from "./errors.ts";

/**
 * Days and times follow the city the craftsman is planning for, which defaults to their base city.
 * Working hours belong to the place the job happens, never to the craftsman's home zone.
 */
export const readScheduleTimeZone = async ({
  db,
  craftsmanId,
  cityId,
}: {
  db: Db;
  craftsmanId: string;
  cityId?: string | undefined;
}) => {
  const scheduleCity = sql`coalesce(${cityId ?? null}, ${craftsmanProfile.baseCityId})`;
  const [zone] = await db
    .select({ id: city.timeZone, scheduleCityId: city.id })
    .from(craftsmanProfile)
    .innerJoin(city, eq(city.id, scheduleCity))
    .where(eq(craftsmanProfile.userId, craftsmanId));
  if (!zone) throw new DomainError({ code: "BAD_REQUEST", message: "Set up your profile first" });
  const { id, scheduleCityId } = zone;
  const timeZone = { id, cityId: cityIdSchema.parse(scheduleCityId) };

  return timeZone;
};

/** Resolves a date (default today) in the time zone to the instants its day starts and ends. */
export const readCalendarDay = async ({
  db,
  date,
  now,
  timeZone,
}: {
  db: Db;
  date: string | undefined;
  now: string;
  timeZone: string;
}) => {
  const [calendarDay] = await db.execute<{
    today: string;
    date: string;
    dayStart: number;
    dayEnd: number;
  }>(sql`
    with requested as (
      select coalesce(
        ${date ?? null}::date,
        (${now}::timestamptz at time zone ${timeZone})::date
      ) as day
    )
    select
      to_char((${now}::timestamptz at time zone ${timeZone})::date, 'YYYY-MM-DD') as "today",
      to_char(day, 'YYYY-MM-DD') as "date",
      (extract(epoch from day::timestamp at time zone ${timeZone}) * 1000)::float8 as "dayStart",
      (extract(epoch from (day + 1)::timestamp at time zone ${timeZone}) * 1000)::float8 as "dayEnd"
    from requested
  `);
  if (!calendarDay) throw new Error("Calendar day is missing");

  return calendarDay;
};
