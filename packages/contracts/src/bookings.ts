import { oc } from "@orpc/contract";
import { z } from "zod";
import { areaSchema } from "./cities.ts";
import { idSchema, timeRangeSchema, userIdSchema } from "./common.ts";
import { craftSchema } from "./crafts.ts";
import { currencySchema, hourlyRateSchema } from "./rates.ts";
import { BOOKING_MIN_MINUTES, durationMinutes, isOnScheduleStep } from "./schedule.ts";

export const bookingInputSchema = timeRangeSchema
  .safeExtend({
    slotId: idSchema,
    location: areaSchema,
    currency: currencySchema,
  })
  .refine(isOnScheduleStep, { message: "Use the 15-minute grid", path: ["start"] })
  .refine((range) => durationMinutes(range) >= BOOKING_MIN_MINUTES, {
    message: "A booking lasts at least 1 hour",
    path: ["end"],
  });
export type BookingInput = z.infer<typeof bookingInputSchema>;
export const bookingSchema = timeRangeSchema.safeExtend({
  id: idSchema,
  customerId: userIdSchema,
  craftsmanId: userIdSchema,
  craft: craftSchema,
  location: areaSchema,
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  currency: currencySchema,
  hourlyRate: hourlyRateSchema,
});
export type Booking = z.infer<typeof bookingSchema>;
export const bookingsContract = {
  create: oc
    .route({
      method: "POST",
      path: "/bookings",
      summary: "Book and consume an entire availability slot",
    })
    .input(bookingInputSchema)
    .output(bookingSchema)
    .errors({
      NOT_FOUND: { message: "Slot unavailable" },
      BAD_REQUEST: { message: "Invalid booking location, range, or currency" },
      CONFLICT: { message: "Slot already booked" },
    }),
};
export const ownBookingsContract = {
  list: oc
    .route({ method: "GET", path: "/me/bookings", summary: "List your bookings" })
    .output(z.array(bookingSchema)),
};
