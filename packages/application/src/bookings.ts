import { type BookingInput, bookingSchema, type SessionUser } from "@local-craftsmen/contracts";
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
import { and, eq, inArray } from "drizzle-orm";
import { DomainError } from "./errors.ts";
import { toWorkEnd } from "./slots.ts";

const toBooking = ({ range, cityId, districtId, ...row }: typeof booking.$inferSelect) => {
  const { start, end } = range;
  const result = bookingSchema.parse({
    ...row,
    start: start.toISOString(),
    end: end.toISOString(),
    location: { cityId, districtId },
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
      const booked = toBooking(created);
      const participants = await tx
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, [customerId, craftsmanId]));
      const [jobCity] = await tx.select({ name: city.name }).from(city).where(eq(city.id, cityId));
      const [jobDistrict] = districtId
        ? await tx.select({ name: district.name }).from(district).where(eq(district.id, districtId))
        : [];
      await tx.insert(bookingHistory).values({
        bookingId: booked.id,
        actorId: customerId,
        event: "created",
        snapshot: {
          booking: booked,
          participants,
          location: {
            ...location,
            cityName: jobCity?.name,
            districtName: jobDistrict?.name ?? null,
          },
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
    const rows = await db.select().from(booking).where(eq(ownerColumn, id)).orderBy(booking.range);
    const bookings = rows.map(toBooking);

    return bookings;
  };
  const service = { create, list };

  return service;
};
export type BookingsService = ReturnType<typeof createBookingsService>;
