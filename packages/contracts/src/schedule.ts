import type { TimeRange } from "./common.ts";

export const SCHEDULE_STEP_MINUTES = 15;
/** Fixed break after every slot and booking; stored slot ranges include it, the API never shows it. */
export const BREAK_MINUTES = 15;
export const SLOT_MIN_MINUTES = 60;
export const SLOT_MAX_MINUTES = 240;
export const BOOKING_MIN_MINUTES = 60;

const MINUTE_MS = 60_000;

export const durationMinutes = ({ start, end }: TimeRange) =>
  (Date.parse(end) - Date.parse(start)) / MINUTE_MS;

export const isOnScheduleStep = ({ start, end }: TimeRange) =>
  [start, end].every((time) => Date.parse(time) % (SCHEDULE_STEP_MINUTES * MINUTE_MS) === 0);
