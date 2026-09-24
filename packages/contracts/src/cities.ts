import { oc } from "@orpc/contract";
import { z } from "zod";

export const CITY_IDS = ["prague", "pilsen", "pardubice"] as const;

export const cityIdSchema = z.enum(CITY_IDS);

export type CityId = z.infer<typeof cityIdSchema>;

export const areaSchema = z.object({
  cityId: cityIdSchema,
  districtId: z.string().min(1).max(100).nullable(),
});

export type Area = z.infer<typeof areaSchema>;

/** The work location carries its own time zone, independent of either participant. */
export const jobLocationSchema = areaSchema.extend({
  cityName: z.string(),
  districtName: z.string().nullable(),
  timeZone: z.string().min(1),
});
export type JobLocation = z.infer<typeof jobLocationSchema>;

export const locationSchema = z.object({
  id: cityIdSchema,
  name: z.string(),
  districts: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type Location = z.infer<typeof locationSchema>;

export const locationsContract = {
  list: oc
    .route({ method: "GET", path: "/locations", summary: "List maintained cities and districts" })
    .output(z.array(locationSchema)),
};
