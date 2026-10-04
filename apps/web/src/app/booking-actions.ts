"use server";

import { type BookingAction, bookingActionSchema, idSchema } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { revalidateLocalized } from "@/lib/revalidate";

export type BookingActionState = { error?: "refused" | "advanceFailed" | "unauthorized" };

const bookedPaths = ["/dashboard"];

export const advanceBooking = async (input: {
  id: string;
  action: BookingAction;
}): Promise<BookingActionState> => {
  const id = idSchema.safeParse(input?.id);
  const action = bookingActionSchema.safeParse(input?.action);
  if (!id.success || !action.success) {
    const invalid: BookingActionState = { error: "advanceFailed" };

    return invalid;
  }
  if (!(await getCurrentUser())) {
    const unauthorized: BookingActionState = { error: "unauthorized" };

    return unauthorized;
  }

  try {
    await apiClient.me.bookings[action.data]({ id: id.data });
  } catch (error) {
    // Someone else moved the job on first; the refreshed page will show where it stands now.
    const refused = error instanceof ORPCError && ["CONFLICT", "NOT_FOUND"].includes(error.code);
    const failure: BookingActionState = { error: refused ? "refused" : "advanceFailed" };
    if (refused) revalidateLocalized(bookedPaths);

    return failure;
  }

  revalidateLocalized(bookedPaths);
  const advanced: BookingActionState = {};

  return advanced;
};
