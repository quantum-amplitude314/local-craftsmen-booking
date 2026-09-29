import { z } from "zod";

export const CRAFTS = [
  "painting",
  "plumbing",
  "electrical",
  "carpentry",
  "tiling",
  "cleaning",
  "it",
  "wellness",
] as const;

export const craftSchema = z.enum(CRAFTS);

export type Craft = z.infer<typeof craftSchema>;
