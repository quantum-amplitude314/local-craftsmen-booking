import { oc } from "@orpc/contract";
import { z } from "zod";
import { meContract } from "./auth.ts";
import { bookingsContract, ownBookingsContract } from "./bookings.ts";
import { locationsContract } from "./cities.ts";
import { craftSchema } from "./crafts.ts";
import { craftsmenContract, ownProfileContract } from "./craftsmen.ts";
import { ownSlotsContract, slotsContract } from "./slots.ts";

export const contract = {
  crafts: {
    list: oc
      .route({ method: "GET", path: "/crafts", summary: "List supported crafts" })
      .output(z.array(craftSchema)),
  },
  craftsmen: craftsmenContract,
  locations: locationsContract,
  slots: slotsContract,
  bookings: bookingsContract,
  me: {
    ...meContract,
    profile: ownProfileContract,
    availability: ownSlotsContract,
    bookings: ownBookingsContract,
  },
};

export type Contract = typeof contract;

export {
  type AuthField,
  type AuthFieldErrors,
  type AuthValidationError,
  getAuthFieldErrors,
  loginSchema,
  registrationSchema,
  type SessionUser,
  sessionUserSchema,
  type UserRole,
  userRoleSchema,
} from "./auth.ts";
export { type Booking, type BookingInput, bookingSchema } from "./bookings.ts";
export {
  type Area,
  areaSchema,
  CITY_IDS,
  type CityId,
  cityIdSchema,
  type Location,
} from "./cities.ts";
export { idSchema, type TimeRange, timeRangeSchema, userIdSchema } from "./common.ts";
export { CRAFTS, type Craft, craftSchema } from "./crafts.ts";
export {
  type CraftsmanProfile,
  craftsmanDetailSchema,
  craftsmanProfileSchema,
  type ProfileInput,
  profileInputSchema,
} from "./craftsmen.ts";
export {
  type CraftsmanRate,
  CURRENCIES,
  type Currency,
  craftsmanRateSchema,
  currencySchema,
} from "./rates.ts";
export {
  BOOKING_MIN_MINUTES,
  BREAK_MINUTES,
  durationMinutes,
  isOnScheduleStep,
  SCHEDULE_STEP_MINUTES,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
} from "./schedule.ts";
export {
  type AvailabilityDay,
  availabilityDaySchema,
  type Slot,
  type SlotInput,
  type SlotListing,
  type SlotSearch,
  type SlotTime,
  scheduleDateSchema,
  slotInputSchema,
  slotListingSchema,
  slotSchema,
} from "./slots.ts";
