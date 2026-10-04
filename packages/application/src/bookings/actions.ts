import type { BookingAction, SessionUser } from "@local-craftsmen/contracts";
import {
  booking,
  bookingHistory,
  bookingLog,
  cancelledBooking,
  completedBooking,
  type Db,
  user,
} from "@local-craftsmen/db";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DomainError } from "../errors.ts";
import { doneAtOf, type OpenBooking, type Party, partyOf, rules } from "./rules.ts";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const customer = alias(user, "customer");
const craftsman = alias(user, "craftsman");

/** Moves an open job to the closed jobs with copies of both names, so it outlives their accounts. */
const closeJob = async ({
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

export const createJobActions = ({ db }: { db: Db }) => {
  const runJobAction = async <Result>({
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
    runJobAction({
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
    runJobAction({
      actor,
      id,
      action: "cancel",
      effect: async ({ tx, row, party, now }) => {
        const [cancelled] = await tx
          .insert(cancelledBooking)
          .values({ id, cancelledAt: now, cancelledById: actor.id, cancelledByName: actor.name })
          .returning();
        const closed = await closeJob({ tx, row, outcome: { cancelledBookingId: id } });
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

  const done = ({ actor, id }: { actor: SessionUser; id: string }) =>
    runJobAction({
      actor,
      id,
      action: "done",
      effect: async ({ tx, row, party, now }) => {
        const marked: OpenBooking = { ...row, [doneAtOf[party]]: now };
        const { customerDoneAt, craftsmanDoneAt, customerReview, craftsmanReview } = marked;
        const completed = customerDoneAt !== null && craftsmanDoneAt !== null;
        const result = { completed };
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

          return result;
        }
        const [outcome] = await tx
          .insert(completedBooking)
          .values({ id, completedAt: now, customerReview, craftsmanReview })
          .returning();
        const closed = await closeJob({ tx, row, outcome: { completedBookingId: id } });
        await tx.insert(bookingLog).values({
          bookingId: id,
          actorId: actor.id,
          event: "completed",
          snapshot: { booking: marked, closed, completed: outcome, by: party },
        });

        return result;
      },
    });

  const actions = { confirm, cancel, done };

  return actions;
};
