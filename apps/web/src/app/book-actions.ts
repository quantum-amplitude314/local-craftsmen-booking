"use server";

import {
  type Booking,
  type BookingOffer,
  bookingInputSchema,
  bookingOfferSchema,
} from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { refresh } from "next/cache";
import { apiClient } from "@/lib/api";
import { isAccessRefused } from "@/lib/api-errors";

export type OfferChange = { current: BookingOffer; craftChanged: boolean; rateChanged: boolean };

export type BookSlotState = {
  /** When the booked job starts, so the bookings calendar can open on its day. */
  bookedStart?: string;
  error?: "taken" | "invalid" | "failed" | "unauthorized";
  offerChange?: OfferChange;
};

/** A slot someone else took first, or times that have since passed, both mean: look again. */
const takenCodes = ["NOT_FOUND", "CONFLICT", "BAD_REQUEST"];

const isTaken = (error: unknown) => error instanceof ORPCError && takenCodes.includes(error.code);

const currentOfferOf = (error: unknown) => {
  if (!(error instanceof ORPCError) || error.code !== "OFFER_CHANGED") return null;
  const parsed = bookingOfferSchema.safeParse(error.data);

  return parsed.success ? parsed.data : null;
};

const bookingError = (error: unknown) => {
  if (isTaken(error)) return "taken";
  if (isAccessRefused(error)) return "unauthorized";

  return "failed";
};

const toOfferChange = ({ seen, current }: { seen: BookingOffer; current: BookingOffer }) => {
  const change: OfferChange = {
    current,
    craftChanged: seen.craft !== current.craft,
    rateChanged: Number(seen.hourlyRate) !== Number(current.hourlyRate),
  };

  return change;
};

export const bookSlot = async (input: unknown): Promise<BookSlotState> => {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    const invalid: BookSlotState = { error: "invalid" };

    return invalid;
  }

  let created: Booking;
  try {
    created = await apiClient.bookings.create(parsed.data);
  } catch (error) {
    const current = currentOfferOf(error);
    if (current) {
      refresh();
      const changed: BookSlotState = {
        offerChange: toOfferChange({ seen: parsed.data, current }),
      };

      return changed;
    }

    const failure: BookSlotState = { error: bookingError(error) };
    if (isTaken(error)) refresh();

    return failure;
  }

  refresh();
  const booked: BookSlotState = { bookedStart: created.start };

  return booked;
};
