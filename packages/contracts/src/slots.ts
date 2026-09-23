import { oc } from "@orpc/contract";
import { z } from "zod";
import { areaSchema, cityIdSchema } from "./cities.ts";
import { idSchema, timeRangeSchema, userIdSchema } from "./common.ts";
import { craftSchema } from "./crafts.ts";
import { craftsmanRateSchema } from "./rates.ts";
import {
  durationMinutes,
  isOnScheduleStep,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
} from "./schedule.ts";

const coverageSchema = z
  .array(areaSchema)
  .min(1)
  .max(100)
  .superRefine((areas, context) => {
    const seen = new Set<string>();
    const wholeCities = new Set(
      areas.filter(({ districtId }) => districtId === null).map(({ cityId }) => cityId),
    );
    areas.forEach(({ cityId, districtId }, index) => {
      const key = `${cityId}:${districtId ?? "*"}`;
      if (seen.has(key) || (districtId !== null && wholeCities.has(cityId))) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Duplicate or redundant coverage",
        });
      }
      seen.add(key);
    });
  });

export const slotInputSchema = timeRangeSchema
  .safeExtend({ areas: coverageSchema })
  .refine(isOnScheduleStep, { message: "Use the 15-minute grid", path: ["start"] })
  .refine(
    (range) => {
      const minutes = durationMinutes(range);
      const allowed = minutes >= SLOT_MIN_MINUTES && minutes <= SLOT_MAX_MINUTES;

      return allowed;
    },
    { message: "A slot lasts 1 to 4 hours", path: ["end"] },
  );
export type SlotInput = z.infer<typeof slotInputSchema>;
export const slotSchema = timeRangeSchema.safeExtend({
  id: idSchema,
  craftsmanId: userIdSchema,
  areas: z.array(areaSchema),
});
export type Slot = z.infer<typeof slotSchema>;

export const slotListingSchema = slotSchema.safeExtend({
  craftsman: z.object({
    id: userIdSchema,
    name: z.string(),
    craft: craftSchema,
    rates: z.array(craftsmanRateSchema),
  }),
});
export type SlotListing = z.infer<typeof slotListingSchema>;

/** A calendar date in the schedule time zone, YYYY-MM-DD. */
export const scheduleDateSchema = z.iso.date();

/** One 15-minute step of a day; `latestEnd` is set only where a new slot may start. */
export const slotTimeSchema = z.object({
  start: z.iso.datetime({ offset: true }),
  state: z.enum(["free", "past", "occupied", "break"]),
  latestEnd: z.iso.datetime({ offset: true }).nullable(),
});
export type SlotTime = z.infer<typeof slotTimeSchema>;

export const availabilityDaySchema = z.object({
  /** Days and times follow the time zone of the craftsman's base city. */
  timeZone: z.object({ id: z.string().min(1), cityId: cityIdSchema }),
  date: scheduleDateSchema,
  today: scheduleDateSchema,
  times: z.array(slotTimeSchema),
  slots: z.array(slotSchema),
  slotDates: z.array(scheduleDateSchema),
});
export type AvailabilityDay = z.infer<typeof availabilityDaySchema>;

export const slotSearchSchema = z
  .object({
    craft: craftSchema.optional(),
    cityId: cityIdSchema.optional(),
    districtId: z.string().min(1).optional(),
    start: z.iso.datetime({ offset: true }).optional(),
    end: z.iso.datetime({ offset: true }).optional(),
  })
  .refine(({ cityId, districtId }) => !districtId || !!cityId, {
    message: "District requires a city",
  })
  .refine(
    ({ start, end }) => (!start && !end) || (!!start && !!end && new Date(start) < new Date(end)),
    { message: "Supply an ordered start and end together" },
  );
export type SlotSearch = z.infer<typeof slotSearchSchema>;

export const slotsContract = {
  list: oc
    .route({
      method: "GET",
      path: "/slots",
      summary: "Search available slots by coverage and time",
    })
    .input(slotSearchSchema)
    .output(z.array(slotListingSchema)),
};

export const ownSlotsContract = {
  day: oc
    .route({
      method: "GET",
      path: "/me/availability/day",
      summary: "Your schedule for one day: time states, where slots may end, and free slots",
    })
    .input(z.object({ date: scheduleDateSchema.optional() }))
    .output(availabilityDaySchema)
    .errors({ BAD_REQUEST: { message: "Set up your profile first" } }),
  create: oc
    .route({
      method: "POST",
      path: "/me/availability",
      summary: "Create a slot with service coverage",
    })
    .input(slotInputSchema)
    .output(slotSchema)
    .errors({
      BAD_REQUEST: { message: "Invalid slot or location" },
      CONFLICT: { message: "Time is already occupied" },
    }),
  remove: oc
    .route({
      method: "DELETE",
      path: "/me/availability/{id}",
      summary: "Delete your availability slot",
    })
    .input(z.object({ id: idSchema }))
    .output(z.object({ deleted: z.literal(true) }))
    .errors({ NOT_FOUND: { message: "Slot not found" } }),
};
