import {
  type Area,
  BREAK_MINUTES,
  cityIdSchema,
  type Slot,
  type SlotInput,
  type SlotListing,
  type SlotSearch,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  craftsmanProfile,
  craftsmanRate,
  type Db,
  district,
  user,
} from "@local-craftsmen/db";
import { and, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";
import { DomainError } from "./errors.ts";
import { readRates } from "./rates.ts";

const BREAK_MS = BREAK_MINUTES * 60_000;
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
            inArray(booking.status, ["pending", "confirmed"]),
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
  const service = { list, search, create, remove };

  return service;
};
export type SlotsService = ReturnType<typeof createSlotsService>;
