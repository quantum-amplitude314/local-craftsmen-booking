import {
  type BookingInput,
  type BookingStatus,
  type BookingTransition,
  bookingSchema,
  type CraftsmanBooking,
  type JobLocation,
  type OwnBooking,
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

type Party = "craftsman" | "customer";

/**
 * Every lifecycle rule in one table: who may ask, which statuses accept the request, and what the
 * job becomes. Completion also waits for the job to be over, which no status can express.
 */
const transitions: Record<
  BookingTransition,
  { by: Party | "either"; from: BookingStatus[]; to: BookingStatus; afterWork?: true }
> = {
  confirm: { by: "craftsman", from: ["pending"], to: "confirmed" },
  cancel: { by: "either", from: ["pending", "confirmed"], to: "cancelled" },
  complete: { by: "craftsman", from: ["confirmed"], to: "completed", afterWork: true },
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

  /** Your own jobs, each carrying the name of whoever is on the other side of it. */
  const list = async ({ user: account }: { user: SessionUser }) => {
    const { id, role } = account;
    const mine = role === "craftsman" ? booking.craftsmanId : booking.customerId;
    const theirs = role === "craftsman" ? booking.customerId : booking.craftsmanId;
    const rows = await db
      .select({ row: booking, place: jobPlaceColumns, partyName: user.name })
      .from(booking)
      .innerJoin(user, eq(user.id, theirs))
      .innerJoin(city, eq(city.id, booking.cityId))
      .leftJoin(district, eq(district.id, booking.districtId))
      .where(eq(mine, id))
      .orderBy(booking.range, booking.id);
    const bookings: OwnBooking[] = rows.map(({ row, place, partyName }) => ({
      ...toBooking({ row, place }),
      partyName,
    }));

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
  /** Moves one job along its lifecycle for the party asking, and records who asked. */
  const advance = async ({
    actor,
    id,
    transition,
  }: {
    actor: SessionUser;
    id: string;
    transition: BookingTransition;
  }) => {
    const { by, from, to, afterWork } = transitions[transition];
    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(booking).where(eq(booking.id, id)).for("update");
      // An outsider is told the same thing as someone naming a job that never existed.
      if (!current) throw new DomainError({ code: "NOT_FOUND", message: "Booking not found" });
      const { craftsmanId, customerId, status, range, cityId, districtId } = current;
      const parties: Record<Party, string> = { craftsman: craftsmanId, customer: customerId };
      const party = (Object.keys(parties) as Party[]).find((name) => parties[name] === actor.id);
      if (!party) throw new DomainError({ code: "NOT_FOUND", message: "Booking not found" });
      if (by !== "either" && by !== party)
        throw new DomainError({ code: "CONFLICT", message: `Only the ${by} can do that` });
      if (!from.includes(status))
        throw new DomainError({ code: "CONFLICT", message: `A ${status} job cannot be ${to}` });
      if (afterWork && range.end > new Date())
        throw new DomainError({ code: "CONFLICT", message: "The job is not over yet" });
      const [updated] = await tx
        .update(booking)
        .set({ status: to, updatedAt: new Date() })
        .where(eq(booking.id, id))
        .returning();
      if (!updated) throw new Error("Updated booking is missing");
      const [place] = await tx
        .select(jobPlaceColumns)
        .from(city)
        .leftJoin(district, and(eq(district.cityId, city.id), eq(district.id, districtId ?? "")))
        .where(eq(city.id, cityId));
      if (!place) throw new DomainError({ code: "BAD_REQUEST", message: "Unknown job city" });
      const advanced = toBooking({ row: updated, place });
      await tx.insert(bookingHistory).values({
        bookingId: advanced.id,
        actorId: actor.id,
        event: to,
        snapshot: { booking: advanced, previousStatus: status, by: party },
      });

      return advanced;
    });

    return result;
  };
  const service = { create, list, range, advance };

  return service;
};
export type BookingsService = ReturnType<typeof createBookingsService>;
