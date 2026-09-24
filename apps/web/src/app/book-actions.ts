"use server";

import { bookingInputSchema } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { revalidateLocalized } from "@/lib/revalidate";

export type BookSlotState = {
  booked?: true;
  error?: "taken" | "invalid" | "failed" | "unauthorized";
};

const bookedPaths = ["/slots", "/dashboard"];
/** A slot someone else took first, or times that have since passed, both mean: look again. */
const takenCodes = ["NOT_FOUND", "CONFLICT", "BAD_REQUEST"];

export const bookSlot = async (input: unknown): Promise<BookSlotState> => {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    const invalid: BookSlotState = { error: "invalid" };

    return invalid;
  }
  const account = await getCurrentUser();
  if (account?.role !== "customer") {
    const unauthorized: BookSlotState = { error: "unauthorized" };

    return unauthorized;
  }

  try {
    await apiClient.bookings.create(parsed.data);
  } catch (error) {
    const taken = error instanceof ORPCError && takenCodes.includes(error.code);
    const failure: BookSlotState = { error: taken ? "taken" : "failed" };
    if (taken) revalidateLocalized(bookedPaths);

    return failure;
  }

  revalidateLocalized(bookedPaths);
  const booked: BookSlotState = { booked: true };

  return booked;
};
