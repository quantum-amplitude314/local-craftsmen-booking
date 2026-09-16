import { oc } from "@orpc/contract";
import { z } from "zod";
import { idSchema, timeRangeSchema, userIdSchema } from "./common.ts";
import { craftSchema } from "./crafts.ts";

export const craftsmanProfileSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  craft: craftSchema,
  city: z.string(),
  hourlyRate: z.number().int().positive(),
  bio: z.string().nullable(),
});

export const craftsmanDetailSchema = craftsmanProfileSchema.extend({
  availability: z.array(timeRangeSchema.and(z.object({ id: idSchema }))),
});

export const craftsmenContract = {
  list: oc
    .route({ method: "GET", path: "/craftsmen", summary: "List craftsmen" })
    .input(z.object({ craft: craftSchema.optional(), city: z.string().optional() }))
    .output(z.array(craftsmanProfileSchema)),
  find: oc
    .route({ method: "GET", path: "/craftsmen/{id}", summary: "Craftsman profile" })
    .input(z.object({ id: userIdSchema }))
    .errors({ NOT_FOUND: { message: "Craftsman not found" } })
    .output(craftsmanDetailSchema),
};
