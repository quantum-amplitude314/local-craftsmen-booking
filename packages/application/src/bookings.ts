import {
  type BookingInput,
  bookingSchema,
  type CraftsmanBooking,
  type JobLocation,
  type SessionUser,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  bookingHistory,
  city,
  craftsmanProfile,
  craftsmanRate,
  type Db,
  district,
  user,
} from "@local-craftsmen/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DomainError } from "./errors.ts";
import { activeBookingStatuses, toWorkEnd } from "./slots.ts";

const jobPlaceColumns = {
  cityName: city.name,
  districtName: district.name,
  timeZone: city.timeZone,
};

const toBooking = ({
  row,
  place,
}: {
  row: typeof booking.$inferSelect;
  place: Pick<JobLocation, "cityName" | "districtName" | "timeZone">;
}) => {
  const { range, cityId, districtId, ...fields } = row;
  const { start, end } = range;
  const result = bookingSchema.parse({
    ...fields,
    start: start.toISOString(),
    end: end.toISOString(),
    location: { cityId, districtId, ...place },
  });

  return result;
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
      const [place] = await tx
        .select(jobPlaceColumns)
        .from(city)
        .leftJoin(district, and(eq(district.cityId, city.id), eq(district.id, districtId ?? "")))
        .where(eq(city.id, cityId));
      if (!place) throw new DomainError({ code: "BAD_REQUEST", message: "Unknown job city" });
      const booked = toBooking({ row: created, place });
      const participants = await tx
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, [customerId, craftsmanId]));
      await tx.insert(bookingHistory).values({
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

  const list = async ({ user: account }: { user: SessionUser }) => {
    const { id, role } = account;
    const ownerColumn = role === "craftsman" ? booking.craftsmanId : booking.customerId;
    const rows = await db
      .select({ row: booking, place: jobPlaceColumns })
      .from(booking)
      .innerJoin(city, eq(city.id, booking.cityId))
      .leftJoin(district, eq(district.id, booking.districtId))
      .where(eq(ownerColumn, id))
      .orderBy(booking.range, booking.id);
    const bookings = rows.map(toBooking);

    return bookings;
  };

  /** Every active job overlapping the window, in UTC. Which calendar day each one lands on is the
   * caller's decision, because only the caller knows the zone its grid is drawn in. */
  const range = async ({
    craftsmanId,
    start,
    end,
  }: {
    craftsmanId: string;
    start: string;
    end: string;
  }) => {
    const rows = await db
      .select({ row: booking, place: jobPlaceColumns, customerName: user.name })
      .from(booking)
      .innerJoin(user, eq(user.id, booking.customerId))
      .innerJoin(city, eq(city.id, booking.cityId))
      .leftJoin(district, eq(district.id, booking.districtId))
      .where(
        and(
          eq(booking.craftsmanId, craftsmanId),
          inArray(booking.status, activeBookingStatuses),
          sql`${booking.range} && tstzrange(${start}::timestamptz, ${end}::timestamptz)`,
        ),
      )
      .orderBy(booking.range, booking.id);
    const bookings: CraftsmanBooking[] = rows.map(({ row, place, customerName }) => ({
      ...toBooking({ row, place }),
      customerName,
    }));

    return bookings;
  };
  const service = { create, list, range };

  return service;
};
export type BookingsService = ReturnType<typeof createBookingsService>;
