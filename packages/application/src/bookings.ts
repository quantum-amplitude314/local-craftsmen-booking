import {
  type BookingAction,
  type BookingInput,
  bookingActionSchema,
  bookingSchema,
  type JobLocation,
  type OwnBooking,
  type SessionUser,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  bookingHistory,
  bookingLog,
  cancelledBooking,
  city,
  completedBooking,
  craftsmanProfile,
  craftsmanRate,
  type Db,
  district,
  user,
} from "@local-craftsmen/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DomainError } from "./errors.ts";
import { toWorkEnd } from "./slots.ts";

const jobPlaceColumns = {
  cityName: city.name,
  districtName: district.name,
  timeZone: city.timeZone,
};

type Party = "craftsman" | "customer";
type OpenBooking = typeof booking.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const doneAtOf = {
  customer: "customerDoneAt",
  craftsman: "craftsmanDoneAt",
} as const satisfies Record<Party, keyof OpenBooking>;

/** Every lifecycle rule in one table (DOMAIN.md, Bookings): when a party may take an action. */
const rules: Record<
  BookingAction,
  (job: { row: OpenBooking; party: Party; now: Date }) => boolean
> = {
  confirm: ({ row, party }) => party === "craftsman" && row.craftsmanConfirmedAt === null,
  cancel: () => true,
  done: ({ row, party, now }) => {
    const { craftsmanConfirmedAt, range } = row;
    const allowed =
      craftsmanConfirmedAt !== null && range.end <= now && row[doneAtOf[party]] === null;

    return allowed;
  },
};

/** Which side of a job someone is on; nobody's side when they are not part of it. */
const partyOf = ({
  row,
  userId,
}: {
  row: Pick<OpenBooking, "craftsmanId" | "customerId">;
  userId: string;
}) => {
  const parties: Record<Party, string> = { craftsman: row.craftsmanId, customer: row.customerId };
  const party = (Object.keys(parties) as Party[]).find((name) => parties[name] === userId);

  return party;
};

/** The actions someone may take with an open job now, from the same rules the actions enforce. */
const allowedActions = ({ row, userId, now }: { row: OpenBooking; userId: string; now: Date }) => {
  const party = partyOf({ row, userId });
  const allowed = party
    ? bookingActionSchema.options.filter((action) => rules[action]({ row, party, now }))
    : [];

  return allowed;
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

const customer = alias(user, "customer");
const craftsman = alias(user, "craftsman");

/**
 * Moves an open job to the closed jobs, linked to its outcome row. Both parties' names are copied,
 * so the closed job outlives their accounts.
 */
const close = async ({
  tx,
  row,
  outcome,
}: {
  tx: Tx;
  row: OpenBooking;
  outcome: { completedBookingId: string } | { cancelledBookingId: string };
}) => {
  const {
    id,
    customerId,
    craftsmanId,
    craft,
    range,
    cityId,
    districtId,
    currency,
    hourlyRate,
    bookedAt,
  } = row;
  const [names] = await tx
    .select({ customerName: customer.name, craftsmanName: craftsman.name })
    .from(booking)
    .innerJoin(customer, eq(customer.id, booking.customerId))
    .innerJoin(craftsman, eq(craftsman.id, booking.craftsmanId))
    .where(eq(booking.id, id));
  if (!names) throw new Error("Parties of the job are missing");
  const [closed] = await tx
    .insert(bookingHistory)
    .values({
      id,
      customerId,
      craftsmanId,
      craft,
      range,
      cityId,
      districtId,
      currency,
      hourlyRate,
      bookedAt,
      ...names,
      ...outcome,
    })
    .returning();
  await tx.delete(booking).where(eq(booking.id, id));

  return closed;
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

  /** Every open job of yours overlapping the window, in UTC, whichever side of it you are on.
   * Which calendar day each one lands on is the caller's decision, because only the caller knows
   * the zone its grid is drawn in. */
  const range = async ({ userId, start, end }: { userId: string; start: string; end: string }) => {
    // NOTE: a correlated subquery, one primary-key lookup per job. A join on the same condition
    // (`join "user" on "user".id in (...) and "user".id <> me`) returns the same rows if needed.
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

  /**
   * Locks one open job, checks the asking party may take the action now, then applies its effect.
   * An outsider is told the same thing as someone naming a job that is not open.
   */
  const act = async <Result>({
    actor,
    id,
    action,
    effect,
  }: {
    actor: SessionUser;
    id: string;
    action: BookingAction;
    effect: (job: { tx: Tx; row: OpenBooking; party: Party; now: Date }) => Promise<Result>;
  }) => {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(booking).where(eq(booking.id, id)).for("update");
      const party = row && partyOf({ row, userId: actor.id });
      if (!row || !party)
        throw new DomainError({ code: "NOT_FOUND", message: "Booking not found" });
      const now = new Date();
      if (!rules[action]({ row, party, now }))
        throw new DomainError({ code: "CONFLICT", message: `Cannot ${action} this job now` });
      const outcome = await effect({ tx, row, party, now });

      return outcome;
    });

    return result;
  };

  const confirm = ({ actor, id }: { actor: SessionUser; id: string }) =>
    act({
      actor,
      id,
      action: "confirm",
      effect: async ({ tx, party, now }) => {
        const [confirmed] = await tx
          .update(booking)
          .set({ craftsmanConfirmedAt: now })
          .where(eq(booking.id, id))
          .returning();
        await tx.insert(bookingLog).values({
          bookingId: id,
          actorId: actor.id,
          event: "confirmed",
          snapshot: { booking: confirmed, by: party },
        });
        const result = { confirmed: true as const };

        return result;
      },
    });

  const cancel = ({ actor, id }: { actor: SessionUser; id: string }) =>
    act({
      actor,
      id,
      action: "cancel",
      effect: async ({ tx, row, party, now }) => {
        const [cancelled] = await tx
          .insert(cancelledBooking)
          .values({ id, cancelledAt: now, cancelledById: actor.id, cancelledByName: actor.name })
          .returning();
        const closed = await close({ tx, row, outcome: { cancelledBookingId: id } });
        await tx.insert(bookingLog).values({
          bookingId: id,
          actorId: actor.id,
          event: "cancelled",
          snapshot: { booking: row, closed, cancelled, by: party },
        });
        const result = { cancelled: true as const };

        return result;
      },
    });

  /** Records the party's done mark; the second mark closes the job as completed. */
  const done = ({ actor, id }: { actor: SessionUser; id: string }) =>
    act({
      actor,
      id,
      action: "done",
      effect: async ({ tx, row, party, now }) => {
        const marked: OpenBooking = { ...row, [doneAtOf[party]]: now };
        const { customerDoneAt, craftsmanDoneAt, customerReview, craftsmanReview } = marked;
        const completed = customerDoneAt !== null && craftsmanDoneAt !== null;
        if (!completed) {
          await tx
            .update(booking)
            .set({ customerDoneAt, craftsmanDoneAt })
            .where(eq(booking.id, id));
          await tx.insert(bookingLog).values({
            bookingId: id,
            actorId: actor.id,
            event: "done",
            snapshot: { booking: marked, by: party },
          });
        } else {
          const [outcome] = await tx
            .insert(completedBooking)
            .values({ id, completedAt: now, customerReview, craftsmanReview })
            .returning();
          const closed = await close({ tx, row, outcome: { completedBookingId: id } });
          await tx.insert(bookingLog).values({
            bookingId: id,
            actorId: actor.id,
            event: "completed",
            snapshot: { booking: marked, closed, completed: outcome, by: party },
          });
        }
        const result = { completed };

        return result;
      },
    });

  const service = { create, range, confirm, cancel, done };

  return service;
};
export type BookingsService = ReturnType<typeof createBookingsService>;
