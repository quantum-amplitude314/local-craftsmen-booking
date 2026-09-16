import { z } from "zod";

export const CRAFTS = ["painter", "plumber", "electrician", "carpenter", "tiler"] as const;

export const craftSchema = z.enum(CRAFTS);

export type Craft = z.infer<typeof craftSchema>;
