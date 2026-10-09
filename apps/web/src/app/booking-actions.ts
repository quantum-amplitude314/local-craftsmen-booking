"use server";

import { type BookingAction, bookingActionSchema, idSchema } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { refresh } from "next/cache";
import { apiClient } from "@/lib/api";
import { isAccessRefused } from "@/lib/api-errors";

export type BookingActionState = { error?: "refused" | "advanceFailed" | "unauthorized" };

/** Someone else moved the job on first; the refreshed page will show where it stands now. */
const isRefused = (error: unknown) =>
  error instanceof ORPCError && ["CONFLICT", "NOT_FOUND"].includes(error.code);

const advanceError = (error: unknown) => {
  if (isRefused(error)) return "refused";
  if (isAccessRefused(error)) return "unauthorized";

  return "advanceFailed";
};

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

  try {
    await apiClient.me.bookings[action.data]({ id: id.data });
  } catch (error) {
    const failure: BookingActionState = { error: advanceError(error) };
    if (isRefused(error)) refresh();

    return failure;
  }

  refresh();
  const advanced: BookingActionState = {};

  return advanced;
};
