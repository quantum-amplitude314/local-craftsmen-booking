import { oc } from "@orpc/contract";
import { z } from "zod";
import { areaSchema } from "./cities.ts";
import { idSchema, timeRangeSchema, userIdSchema } from "./common.ts";
import { craftSchema } from "./crafts.ts";

export const craftsmanProfileSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  craft: craftSchema,
  baseArea: areaSchema,
  hourlyRate: z.number().int().positive(),
  bio: z.string().nullable(),
});

export type CraftsmanProfile = z.infer<typeof craftsmanProfileSchema>;

export const craftsmanDetailSchema = craftsmanProfileSchema.extend({
  availability: z.array(timeRangeSchema.and(z.object({ id: idSchema }))),
});

export const craftsmenContract = {
  list: oc
    .route({ method: "GET", path: "/craftsmen", summary: "List craftsmen" })
    .input(z.object({ craft: craftSchema.optional() }))
    .output(z.array(craftsmanProfileSchema)),
  find: oc
    .route({ method: "GET", path: "/craftsmen/{id}", summary: "Craftsman profile" })
    .input(z.object({ id: userIdSchema }))
    .errors({ NOT_FOUND: { message: "Craftsman not found" } })
    .output(craftsmanDetailSchema),
};
