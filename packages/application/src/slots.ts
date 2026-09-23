import {
  type Area,
  type AvailabilityDay,
  BREAK_MINUTES,
  cityIdSchema,
  SLOT_MAX_MINUTES,
  type Slot,
  type SlotInput,
  type SlotListing,
  type SlotSearch,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  city,
  craftsmanProfile,
  craftsmanRate,
  type Db,
  district,
  user,
} from "@local-craftsmen/db";
import { and, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";
import { DomainError } from "./errors.ts";
import { readRates } from "./rates.ts";
import { type BlockedRange, buildSlotTimes } from "./slot-times.ts";

const BREAK_MS = BREAK_MINUTES * 60_000;
const SLOT_MAX_MS = SLOT_MAX_MINUTES * 60_000;
const activeBookingStatuses: ("pending" | "confirmed")[] = ["pending", "confirmed"];
const breakInterval = sql.raw(`interval '${BREAK_MINUTES} minutes'`);
const workRange = sql`tstzrange(lower(${availability.range}), upper(${availability.range}) - ${breakInterval}, '[)')`;

/** Stored slot ranges include the break after the working time. */
export const toStoredEnd = (workEnd: Date) => new Date(workEnd.getTime() + BREAK_MS);
export const toWorkEnd = (storedEnd: Date) => new Date(storedEnd.getTime() - BREAK_MS);

type SlotRow = {
  id: string;
  craftsmanId: string;
  range: { start: Date; end: Date };
};

export const slotPredicate = ({
  db,
  input,
  craftsmanId,
}: {
  db: Db;
  input: SlotSearch;
  craftsmanId?: string;
}) => {
  const { cityId, districtId, start, end, craft } = input;
  const predicate = and(
    sql`upper(${workRange}) > now()`,
    districtId && cityId
      ? exists(
          db
            .select({ id: district.id })
            .from(district)
            .where(and(eq(district.id, districtId), eq(district.cityId, cityId))),
        )
      : undefined,
    craftsmanId ? eq(availability.craftsmanId, craftsmanId) : undefined,
    craft
      ? exists(
          db
            .select({ id: craftsmanProfile.userId })
            .from(craftsmanProfile)
            .where(
              and(
                eq(craftsmanProfile.userId, availability.craftsmanId),
                eq(craftsmanProfile.craft, craft),
              ),
            ),
        )
      : undefined,
    start && end
      ? sql`${workRange} @> tstzrange(${start}::timestamptz, ${end}::timestamptz, '[)')`
      : undefined,
    cityId
      ? exists(
          db
            .select({ id: availabilityArea.id })
            .from(availabilityArea)
            .where(
              and(
                eq(availabilityArea.availabilityId, availability.id),
                eq(availabilityArea.cityId, cityId),
                districtId
                  ? or(
                      isNull(availabilityArea.districtId),
                      eq(availabilityArea.districtId, districtId),
                    )
                  : undefined,
              ),
            ),
        )
      : undefined,
  );

  return predicate;
};

export const createSlotsService = ({ db }: { db: Db }) => {
  const readAreas = async ({ ids }: { ids: string[] }) => {
    const areasBySlot = new Map<string, Area[]>();
    if (ids.length === 0) return areasBySlot;

    const rows = await db
      .select()
      .from(availabilityArea)
      .where(inArray(availabilityArea.availabilityId, ids))
      .orderBy(availabilityArea.cityId, availabilityArea.districtId);
    for (const { availabilityId, cityId, districtId } of rows) {
      const areas = areasBySlot.get(availabilityId) ?? [];
      areas.push({ cityId: cityIdSchema.parse(cityId), districtId });
      areasBySlot.set(availabilityId, areas);
    }

    return areasBySlot;
  };

  const toSlot = ({ row, areasBySlot }: { row: SlotRow; areasBySlot: Map<string, Area[]> }) => {
    const { id, craftsmanId, range } = row;
    const { start, end } = range;
    const slot: Slot = {
      id,
      craftsmanId,
      start: start.toISOString(),
      end: toWorkEnd(end).toISOString(),
      areas: areasBySlot.get(id) ?? [],
    };

    return slot;
  };

  const list = async ({
    input = {},
    craftsmanId,
  }: {
    input?: SlotSearch;
    craftsmanId?: string;
  }) => {
    const rows = await db
      .select()
      .from(availability)
      .where(slotPredicate({ db, input, ...(craftsmanId ? { craftsmanId } : {}) }))
      .orderBy(availability.range);
    const areasBySlot = await readAreas({ ids: rows.map(({ id }) => id) });
    const slots = rows.map((row) => toSlot({ row, areasBySlot }));

    return slots;
  };

  const search = async ({ input }: { input: SlotSearch }) => {
    const rows = await db
      .select({
        id: availability.id,
        craftsmanId: availability.craftsmanId,
        range: availability.range,
        name: user.name,
        craft: craftsmanProfile.craft,
      })
      .from(availability)
      .innerJoin(craftsmanProfile, eq(craftsmanProfile.userId, availability.craftsmanId))
      .innerJoin(user, eq(user.id, availability.craftsmanId))
      .where(slotPredicate({ db, input }))
      .orderBy(availability.range);
    const craftsmanIds = [...new Set(rows.map(({ craftsmanId }) => craftsmanId))];
    const [areasBySlot, ratesByCraftsman] = await Promise.all([
      readAreas({ ids: rows.map(({ id }) => id) }),
      readRates({ db, ids: craftsmanIds }),
    ]);
    const listings: SlotListing[] = rows.map(({ name, craft, ...row }) => {
      const { craftsmanId } = row;
      const listing = {
        ...toSlot({ row, areasBySlot }),
        craftsman: { id: craftsmanId, name, craft, rates: ratesByCraftsman.get(craftsmanId) ?? [] },
      };

      return listing;
    });

    return listings;
  };

  const readBaseTimeZone = async ({ craftsmanId }: { craftsmanId: string }) => {
    const [zone] = await db
      .select({ id: city.timeZone, cityId: city.id })
      .from(craftsmanProfile)
      .innerJoin(city, eq(city.id, craftsmanProfile.baseCityId))
      .where(eq(craftsmanProfile.userId, craftsmanId));
    if (!zone) throw new DomainError({ code: "BAD_REQUEST", message: "Set up your profile first" });
    const { id, cityId } = zone;
    const timeZone = { id, cityId: cityIdSchema.parse(cityId) };

    return timeZone;
  };

  /** Resolves a date (default today) in the time zone to the instants its day starts and ends. */
  const readCalendarDay = async ({
    date,
    now,
    timeZone,
  }: {
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

  const day = async ({ craftsmanId, date }: { craftsmanId: string; date?: string | undefined }) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const timeZone = await readBaseTimeZone({ craftsmanId });
    const calendarDay = await readCalendarDay({ date, now: nowIso, timeZone: timeZone.id });
    const { dayStart, dayEnd } = calendarDay;
    const reach = sql`tstzrange(${new Date(dayStart).toISOString()}::timestamptz, ${new Date(dayEnd + SLOT_MAX_MS + BREAK_MS).toISOString()}::timestamptz, '[)')`;
    const [slotRows, bookingRows, slotDateRows] = await Promise.all([
      db
        .select({
          id: availability.id,
          craftsmanId: availability.craftsmanId,
          range: availability.range,
        })
        .from(availability)
        .where(
          and(eq(availability.craftsmanId, craftsmanId), sql`${availability.range} && ${reach}`),
        )
        .orderBy(availability.range),
      db
        .select({ range: booking.range })
        .from(booking)
        .where(
          and(
            eq(booking.craftsmanId, craftsmanId),
            inArray(booking.status, activeBookingStatuses),
            sql`tstzrange(lower(${booking.range}), upper(${booking.range}) + ${breakInterval}, '[)') && ${reach}`,
          ),
        ),
      db
        .selectDistinct({
          date: sql<string>`to_char(lower(${availability.range}) at time zone ${timeZone.id}, 'YYYY-MM-DD')`,
        })
        .from(availability)
        .where(
          and(
            eq(availability.craftsmanId, craftsmanId),
            sql`upper(${workRange}) > ${nowIso}::timestamptz`,
          ),
        )
        .orderBy(sql`1`),
    ]);
    const blocked: BlockedRange[] = [
      ...slotRows.map(({ range: { start, end } }) => ({
        start: start.getTime(),
        workEnd: toWorkEnd(end).getTime(),
        end: end.getTime(),
      })),
      ...bookingRows.map(({ range: { start, end } }) => ({
        start: start.getTime(),
        workEnd: end.getTime(),
        end: end.getTime() + BREAK_MS,
      })),
    ];
    const daySlotRows = slotRows.filter(({ range: { start, end } }) => {
      const workEnd = toWorkEnd(end).getTime();
      const freeThatDay = start.getTime() < dayEnd && workEnd > dayStart && workEnd > now.getTime();

      return freeThatDay;
    });
    const areasBySlot = await readAreas({ ids: daySlotRows.map(({ id }) => id) });
    const { today, date: resolvedDate } = calendarDay;
    const schedule: AvailabilityDay = {
      timeZone,
      date: resolvedDate,
      today,
      times: buildSlotTimes({ dayStart, dayEnd, blocked, now: now.getTime() }),
      slots: daySlotRows.map((row) => toSlot({ row, areasBySlot })),
      slotDates: slotDateRows.map(({ date }) => date),
    };

    return schedule;
  };

  const create = async ({ craftsmanId, input }: { craftsmanId: string; input: SlotInput }) => {
    const { start, end, areas } = input;
    const storedEnd = toStoredEnd(new Date(end));
    if (new Date(start) <= new Date())
      throw new DomainError({ code: "BAD_REQUEST", message: "Slot must start in the future" });
    const slot = await db.transaction(async (tx) => {
      const [profile] = await tx
        .select({ id: craftsmanProfile.userId })
        .from(craftsmanProfile)
        .where(eq(craftsmanProfile.userId, craftsmanId))
        .for("update");
      if (!profile)
        throw new DomainError({ code: "BAD_REQUEST", message: "Set up your profile first" });
      const [rate] = await tx
        .select({ currency: craftsmanRate.currency })
        .from(craftsmanRate)
        .where(eq(craftsmanRate.craftsmanId, craftsmanId))
        .limit(1);
      if (!rate)
        throw new DomainError({ code: "BAD_REQUEST", message: "Set an hourly rate first" });
      const [occupied] = await tx
        .select({ id: booking.id })
        .from(booking)
        .where(
          and(
            eq(booking.craftsmanId, craftsmanId),
            inArray(booking.status, activeBookingStatuses),
            sql`tstzrange(lower(${booking.range}), upper(${booking.range}) + ${breakInterval}, '[)') && tstzrange(${start}::timestamptz, ${storedEnd.toISOString()}::timestamptz, '[)')`,
          ),
        )
        .limit(1);
      if (occupied) throw new DomainError({ code: "CONFLICT", message: "Time overlaps a booking" });
      const [row] = await tx
        .insert(availability)
        .values({ craftsmanId, range: { start: new Date(start), end: storedEnd } })
        .returning({ id: availability.id });
      if (!row) throw new Error("Created slot is missing");
      const { id } = row;
      await tx
        .insert(availabilityArea)
        .values(
          areas.map(({ cityId, districtId }) => ({ availabilityId: id, cityId, districtId })),
        );
      const result: Slot = {
        id,
        craftsmanId,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        areas,
      };

      return result;
    });

    return slot;
  };

  const remove = async ({ craftsmanId, id }: { craftsmanId: string; id: string }) => {
    const deleted = await db.transaction(async (tx) => {
      await tx
        .select({ id: craftsmanProfile.userId })
        .from(craftsmanProfile)
        .where(eq(craftsmanProfile.userId, craftsmanId))
        .for("update");
      const [row] = await tx
        .delete(availability)
        .where(and(eq(availability.id, id), eq(availability.craftsmanId, craftsmanId)))
        .returning({ id: availability.id });
      if (!row) throw new DomainError({ code: "NOT_FOUND", message: "Slot not found" });
      const result = { deleted: true as const };

      return result;
    });

    return deleted;
  };
  const service = { list, search, day, create, remove };

  return service;
};
export type SlotsService = ReturnType<typeof createSlotsService>;
