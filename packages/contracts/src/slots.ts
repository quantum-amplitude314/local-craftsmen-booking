import { oc } from "@orpc/contract";
import { z } from "zod";
import { areaSchema, cityIdSchema } from "./cities.ts";
import { idSchema, timeRangeSchema, userIdSchema } from "./common.ts";
import { craftSchema } from "./crafts.ts";
import { craftsmanRateSchema } from "./rates.ts";

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

export const slotInputSchema = timeRangeSchema.safeExtend({ areas: coverageSchema });
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
  list: oc
    .route({ method: "GET", path: "/me/availability", summary: "List your availability slots" })
    .output(z.array(slotSchema)),
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
