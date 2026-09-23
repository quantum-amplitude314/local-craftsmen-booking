import { SCHEDULE_STEP_MINUTES, SLOT_MIN_MINUTES } from "@local-craftsmen/contracts";

const STEP_MS = SCHEDULE_STEP_MINUTES * 60_000;
const SLOT_MIN_MS = SLOT_MIN_MINUTES * 60_000;

export type SlotSelection = { start: string | null; end: string | null };

export const emptySelection: SlotSelection = { start: null, end: null };

/** Ends on the 15-minute grid, from 1 hour after the start up to the latest end the API allows. */
export const endsFrom = ({ start, latestEnd }: { start: string; latestEnd: string }) => {
  const first = Date.parse(start) + SLOT_MIN_MS;
  const count = (Date.parse(latestEnd) - first) / STEP_MS + 1;
  const ends = Array.from({ length: Math.max(0, count) }, (_, index) =>
    new Date(first + index * STEP_MS).toISOString(),
  );

  return ends;
};

/** The first pick is the start, a valid end completes the slot, and picking the start again clears it. */
export const pickSlotTime = ({
  selection,
  time,
  ends,
}: {
  selection: SlotSelection;
  time: string;
  ends: string[];
}) => {
  const { start } = selection;
  if (time === start) return emptySelection;
  const picked: SlotSelection =
    start !== null && ends.includes(time) ? { start, end: time } : { start: time, end: null };

  return picked;
};
