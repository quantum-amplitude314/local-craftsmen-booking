import { type BookingAction, bookingActionSchema } from "@local-craftsmen/contracts";
import type { booking } from "@local-craftsmen/db";

export type Party = "craftsman" | "customer";
export type OpenBooking = typeof booking.$inferSelect;

export const doneAtOf = {
  customer: "customerDoneAt",
  craftsman: "craftsmanDoneAt",
} as const satisfies Record<Party, keyof OpenBooking>;

/** When a party may take an action on an open job (DOMAIN.md, Bookings). */
export const rules: Record<
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

export const partyOf = ({
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

export const allowedActions = ({
  row,
  userId,
  now,
}: {
  row: OpenBooking;
  userId: string;
  now: Date;
}) => {
  const party = partyOf({ row, userId });
  const allowed = party
    ? bookingActionSchema.options.filter((action) => rules[action]({ row, party, now }))
    : [];

  return allowed;
};
