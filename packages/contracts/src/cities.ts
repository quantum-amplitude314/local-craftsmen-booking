import { z } from "zod";

export const CITY_IDS = ["prague", "pilsen", "pardubice"] as const;

export const cityIdSchema = z.enum(CITY_IDS);

export type CityId = z.infer<typeof cityIdSchema>;

/** A maintained city by identifier, or a free-text city outside the maintained list. */
export const areaCitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("maintained"), id: cityIdSchema }),
  z.object({ kind: z.literal("other"), name: z.string() }),
]);

export const areaSchema = z.object({
  city: areaCitySchema,
  district: z.string().nullable(),
});

export type Area = z.infer<typeof areaSchema>;
