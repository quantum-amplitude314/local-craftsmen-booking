import {
  cityIdSchema,
  type Slot,
  type SlotInput,
  type SlotSearch,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  craftsmanProfile,
  type Db,
  district,
} from "@local-craftsmen/db";
import { and, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";
import { DomainError } from "./errors.ts";

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
    sql`upper(${availability.range}) > now()`,
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
      ? sql`${availability.range} @> tstzrange(${start}::timestamptz, ${end}::timestamptz, '[)')`
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
    if (!rows.length) return [];
    const areas = await db
      .select()
      .from(availabilityArea)
      .where(
        inArray(
          availabilityArea.availabilityId,
          rows.map(({ id }) => id),
        ),
      )
      .orderBy(availabilityArea.cityId, availabilityArea.districtId);
    const slots: Slot[] = rows.map(({ id, craftsmanId, range }) => {
      const { start, end } = range;
      const slot = {
        id,
        craftsmanId,
        start: start.toISOString(),
        end: end.toISOString(),
        areas: areas
          .filter(({ availabilityId }) => availabilityId === id)
          .map(({ cityId, districtId }) => ({ cityId: cityIdSchema.parse(cityId), districtId })),
      };

      return slot;
    });

    return slots;
  };

  const create = async ({ craftsmanId, input }: { craftsmanId: string; input: SlotInput }) => {
    const { start, end, areas } = input;
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
      const [occupied] = await tx
        .select({ id: booking.id })
        .from(booking)
        .where(
          and(
            eq(booking.craftsmanId, craftsmanId),
            inArray(booking.status, ["pending", "confirmed"]),
            sql`${booking.range} && tstzrange(${start}::timestamptz, ${end}::timestamptz, '[)')`,
          ),
        )
        .limit(1);
      if (occupied) throw new DomainError({ code: "CONFLICT", message: "Time overlaps a booking" });
      const [row] = await tx
        .insert(availability)
        .values({ craftsmanId, range: { start: new Date(start), end: new Date(end) } })
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
  const service = { list, create, remove };

  return service;
};
export type SlotsService = ReturnType<typeof createSlotsService>;
