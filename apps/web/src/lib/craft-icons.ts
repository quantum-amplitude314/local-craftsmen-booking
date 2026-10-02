import type { Craft } from "@local-craftsmen/contracts";
import {
  Grid2x2,
  Hammer,
  HeartPulse,
  Laptop,
  type LucideIcon,
  PaintRoller,
  SprayCan,
  Wrench,
  Zap,
} from "lucide-react";

/** One icon per service, shown beside its name. */
export const craftIcons: Record<Craft, LucideIcon> = {
  painting: PaintRoller,
  plumbing: Wrench,
  electrical: Zap,
  carpentry: Hammer,
  tiling: Grid2x2,
  cleaning: SprayCan,
  it: Laptop,
  wellness: HeartPulse,
};
