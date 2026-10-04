import {
  type BookingInput,
  bookingSchema,
  type JobLocation,
  type OwnBooking,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  bookingLog,
  city,
  craftsmanProfile,
  craftsmanRate,
  type Db,
  district,
  user,
} from "@local-craftsmen/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DomainError } from "../errors.ts";
import { toWorkEnd } from "../slots.ts";
import { createJobActions } from "./actions.ts";
import { allowedActions, type OpenBooking } from "./rules.ts";

const jobPlaceColumns = {
  cityName: city.name,
  districtName: district.name,
  timeZone: city.timeZone,
};

const toBooking = ({
  row,
  place,
}: {
  row: OpenBooking;
  place: Pick<JobLocation, "cityName" | "districtName" | "timeZone">;
}) => {
  const { range, cityId, districtId, craftsmanConfirmedAt, ...fields } = row;
  const { start, end } = range;
  const result = bookingSchema.parse({
    ...fields,
    start: start.toISOString(),
    end: end.toISOString(),
    location: { cityId, districtId, ...place },
    craftsmanConfirmedAt: craftsmanConfirmedAt?.toISOString() ?? null,
  });

  return result;
};

/** The names and zone of the place a job is in, read inside the caller's transaction. */
const loadPlace = async ({
  tx,
  cityId,
  districtId,
}: {
  tx: Pick<Db, "select">;
  cityId: string;
  districtId: string | null;
}) => {
  const [place] = await tx
    .select(jobPlaceColumns)
    .from(city)
    .leftJoin(district, and(eq(district.cityId, city.id), eq(district.id, districtId ?? "")))
    .where(eq(city.id, cityId));
  if (!place) throw new DomainError({ code: "BAD_REQUEST", message: "Unknown job city" });

  return place;
};

export const createBookingsService = ({ db }: { db: Db }) => {
  const create = async ({ customerId, input }: { customerId: string; input: BookingInput }) => {
    const { slotId, start, end, location, currency } = input;
    const { cityId, districtId } = location;
    const result = await db.transaction(async (tx) => {
      const [candidate] = await tx
        .select({ craftsmanId: availability.craftsmanId })
        .from(availability)
        .where(eq(availability.id, slotId));
      if (!candidate) throw new DomainError({ code: "NOT_FOUND", message: "Slot unavailable" });
      const { craftsmanId } = candidate;
      // All slot mutations and rate changes lock the owner first; this keeps prices and capacity consistent.
      const [profile] = await tx
        .select({ craft: craftsmanProfile.craft })
        .from(craftsmanProfile)
        .where(eq(craftsmanProfile.userId, craftsmanId))
        .for("update");
      const [slot] = await tx
        .select()
        .from(availability)
        .where(eq(availability.id, slotId))
        .for("update");
      if (!slot || !profile)
        throw new DomainError({ code: "CONFLICT", message: "Slot already consumed" });
      const { range } = slot;
      const workEnd = toWorkEnd(range.end);
      const requestedStart = new Date(start);
      const requestedEnd = new Date(end);
      if (requestedStart <= new Date() || requestedStart < range.start || requestedEnd > workEnd) {
        throw new DomainError({
          code: "BAD_REQUEST",
          message: "Requested time is outside the slot",
        });
      }
      const areas = await tx
        .select({
          cityId: availabilityArea.cityId,
          districtId: availabilityArea.districtId,
          cityName: city.name,
          districtName: district.name,
        })
        .from(availabilityArea)
        .innerJoin(city, eq(city.id, availabilityArea.cityId))
        .leftJoin(district, eq(district.id, availabilityArea.districtId))
        .where(eq(availabilityArea.availabilityId, slotId));
      if (
        !areas.some(
          ({ cityId: coveredCity, districtId: coveredDistrict }) =>
            coveredCity === cityId && (coveredDistrict === null || coveredDistrict === districtId),
        )
      ) {
        throw new DomainError({
          code: "BAD_REQUEST",
          message: "Job location is not covered by the slot",
        });
      }
      const [rate] = await tx
        .select({ hourlyRate: craftsmanRate.hourlyRate })
        .from(craftsmanRate)
        .where(
          and(eq(craftsmanRate.craftsmanId, craftsmanId), eq(craftsmanRate.currency, currency)),
        );
      if (!rate) throw new DomainError({ code: "BAD_REQUEST", message: "Currency is not offered" });
      const { hourlyRate } = rate;
      const { craft } = profile;
      const [created] = await tx
        .insert(booking)
        .values({
          customerId,
          craftsmanId,
          craft,
          range: { start: requestedStart, end: requestedEnd },
          cityId,
          districtId,
          currency,
          hourlyRate,
        })
        .returning();
      if (!created) throw new Error("Created booking is missing");
      const place = await loadPlace({ tx, cityId, districtId });
      const booked = toBooking({ row: created, place });
      const participants = await tx
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, [customerId, craftsmanId]));
      await tx.insert(bookingLog).values({
        bookingId: booked.id,
        actorId: customerId,
        event: "created",
        snapshot: {
          booking: booked,
          participants,
          location: booked.location,
          slot: {
            id: slotId,
            craftsmanId,
            start: range.start.toISOString(),
            end: workEnd.toISOString(),
            areas,
          },
        },
      });
      // Consuming even part of a slot removes it completely; coverage links cascade with it.
      await tx.delete(availability).where(eq(availability.id, slotId));

      return booked;
    });

    return result;
  };

  /** Every open job of yours overlapping the window, in UTC; the caller files them under days. */
  const range = async ({ userId, start, end }: { userId: string; start: string; end: string }) => {
    const otherPartyName = sql<string>`(
      select ${user.name} from ${user}
      where ${user.id} in (${booking.customerId}, ${booking.craftsmanId}) and ${user.id} <> ${userId}
    )`;
    const rows = await db
      .select({ row: booking, place: jobPlaceColumns, partyName: otherPartyName })
      .from(booking)
      .innerJoin(city, eq(city.id, booking.cityId))
      .leftJoin(district, eq(district.id, booking.districtId))
      .where(
        and(
          sql`${userId} in (${booking.customerId}, ${booking.craftsmanId})`,
          sql`${booking.range} && tstzrange(${start}::timestamptz, ${end}::timestamptz)`,
        ),
      )
      .orderBy(booking.range, booking.id);
    const now = new Date();
    const bookings: OwnBooking[] = rows.map(({ row, place, partyName }) => ({
      ...toBooking({ row, place }),
      partyName,
      actions: allowedActions({ row, userId, now }),
    }));

    return bookings;
  };

  const service = { create, range, ...createJobActions({ db }) };

  return service;
};

export type BookingsService = ReturnType<typeof createBookingsService>;
