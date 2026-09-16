import { z } from "zod";

export const userIdSchema = z.string().min(1);
export const idSchema = z.uuid();

export const timeRangeSchema = z
  .object({
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
  })
  .refine(({ start, end }) => new Date(start) < new Date(end), {
    message: "end must be after start",
    path: ["end"],
  });

export type TimeRange = z.infer<typeof timeRangeSchema>;
