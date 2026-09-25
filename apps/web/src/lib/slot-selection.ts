import {
  durationMinutes,
  type Quarter,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
} from "@local-craftsmen/contracts";

/** The first and last selected quarter-hour, by their start times. */
export type QuarterSelection = { first: string; last: string } | null;

export type SelectedRange = { start: string; end: string; quarters: Set<string> };

/** Whether the current selection can be saved, or what it still needs. */
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
 * A click stretches the selection to include the quarter, so clicking every quarter or just the
 * first and last gives the same range. A click inside the range ends it there, so shortening takes
 * one click. Clicking one edge keeps only the other edge, and clicking a lone quarter clears it. A
 * click beyond a taken quarter or a break starts a new selection there.
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

/** Why the range cannot be saved yet; the API enforces the same limits. */
export const draftStatus = ({ range }: { range: SelectedRange | null }): DraftStatus => {
  if (!range) return "pickRange";
  const minutes = durationMinutes(range);
  if (minutes < SLOT_MIN_MINUTES) return "tooShort";
  if (minutes > SLOT_MAX_MINUTES) return "tooLong";

  return "ready";
};
