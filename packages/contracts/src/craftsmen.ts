import { oc } from "@orpc/contract";
import { z } from "zod";
import { areaSchema } from "./cities.ts";
import { userIdSchema } from "./common.ts";
import { craftSchema } from "./crafts.ts";
import { craftsmanRateSchema, profileRatesInputSchema } from "./rates.ts";
import { slotSchema } from "./slots.ts";

export const craftsmanProfileSchema = z.object({
  id: userIdSchema,
  name: z.string(),
  craft: craftSchema,
  baseArea: areaSchema,
  rates: z.array(craftsmanRateSchema),
  bio: z.string().nullable(),
});

export type CraftsmanProfile = z.infer<typeof craftsmanProfileSchema>;

export const profileInputSchema = z.object({
  craft: craftSchema,
  baseArea: areaSchema,
  bio: z.string().trim().max(2000).nullable(),
  rates: profileRatesInputSchema,
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export const ownProfileContract = {
  get: oc
    .route({ method: "GET", path: "/me/profile", summary: "Read your craftsman profile" })
    .output(craftsmanProfileSchema.nullable()),
  save: oc
    .route({ method: "PUT", path: "/me/profile", summary: "Save your craftsman profile and rates" })
    .input(profileInputSchema)
    .errors({
      BAD_REQUEST: { message: "Invalid profile location" },
      CONFLICT: { message: "Keep a rate while you have future slots" },
    })
    .output(craftsmanProfileSchema),
};

export const craftsmanDetailSchema = craftsmanProfileSchema.extend({
  availability: z.array(slotSchema),
});

export const craftsmenContract = {
  find: oc
    .route({ method: "GET", path: "/craftsmen/{id}", summary: "Craftsman profile" })
    .input(z.object({ id: userIdSchema }))
    .errors({ NOT_FOUND: { message: "Craftsman not found" } })
    .output(craftsmanDetailSchema),
};
