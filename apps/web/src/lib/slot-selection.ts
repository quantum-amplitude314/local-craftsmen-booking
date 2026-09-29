import {
  BOOKING_MIN_MINUTES,
  durationMinutes,
  type Quarter,
  SCHEDULE_STEP_MINUTES,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
} from "@local-craftsmen/contracts";

export type QuarterSelection = { first: string; last: string } | null;

export type SelectedRange = { start: string; end: string; quarters: Set<string> };

export type DraftStatus = "pickRange" | "tooShort" | "tooLong" | "ready";

const indexOf = ({ quarters, time }: { quarters: Quarter[]; time: string }) =>
  quarters.findIndex(({ start }) => start === time);

/**
 * The selected quarters as a range, or null once any of them is gone or no longer free — after a
 * save, a deletion or a day change the selection simply disappears.
 */
export const selectedRange = ({
  selection,
  quarters,
}: {
  selection: QuarterSelection;
  quarters: Quarter[];
}) => {
  if (!selection) return null;
  const { first, last } = selection;
  const selected = quarters.slice(
    indexOf({ quarters, time: first }),
    indexOf({ quarters, time: last }) + 1,
  );
  const [firstQuarter] = selected;
  const lastQuarter = selected.at(-1);
  const valid =
    firstQuarter?.start === first &&
    lastQuarter?.start === last &&
    selected.every(({ state }) => state === "free");
  const range: SelectedRange | null =
    valid && lastQuarter
      ? {
          start: firstQuarter.start,
          end: lastQuarter.end,
          quarters: new Set(selected.map(({ start }) => start)),
        }
      : null;

  return range;
};

/**
 * A click outside the range stretches it to that quarter, or starts over there when a quarter in
 * between is not free. A click inside ends the range there, an edge keeps only the other edge, and
 * a lone quarter clears.
 */
export const pickQuarter = ({
  selection,
  time,
  quarters,
}: {
  selection: QuarterSelection;
  time: string;
  quarters: Quarter[];
}) => {
  if (!selection) return { first: time, last: time };
  const { first, last } = selection;
  const firstIndex = indexOf({ quarters, time: first });
  const lastIndex = indexOf({ quarters, time: last });
  const index = indexOf({ quarters, time });
  if (first === last && time === first) return null;
  if (time === first) return { first: last, last };
  if (time === last) return { first, last: first };
  if (index > firstIndex && index < lastIndex) return { first, last: time };
  const from = Math.min(firstIndex, index);
  const to = Math.max(lastIndex, index);
  const reachable = quarters.slice(from, to + 1).every(({ state }) => state === "free");
  const picked: QuarterSelection = reachable
    ? { first: quarters[from]?.start ?? time, last: quarters[to]?.start ?? time }
    : { first: time, last: time };

  return picked;
};

/** The earliest hour of free quarters, so booking the soonest time takes a single click. */
export const firstFreeHour = ({ quarters }: { quarters: Quarter[] }) => {
  const length = BOOKING_MIN_MINUTES / SCHEDULE_STEP_MINUTES;
  const from = quarters.findIndex((_, index) => {
    const hour = quarters.slice(index, index + length);
    const free = hour.length === length && hour.every(({ state }) => state === "free");

    return free;
  });
  const first = quarters[from];
  const last = quarters[from + length - 1];
  const selection: QuarterSelection =
    first && last ? { first: first.start, last: last.start } : null;

  return selection;
};

/** Why the range cannot be saved yet; the API enforces the same limits. */
export const draftStatus = ({ range }: { range: SelectedRange | null }): DraftStatus => {
  if (!range) return "pickRange";
  const minutes = durationMinutes(range);
  if (minutes < SLOT_MIN_MINUTES) return "tooShort";
  if (minutes > SLOT_MAX_MINUTES) return "tooLong";

  return "ready";
};
