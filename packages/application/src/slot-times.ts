import { BREAK_MINUTES, type Quarter, SCHEDULE_STEP_MINUTES } from "@local-craftsmen/contracts";

const STEP_MS = SCHEDULE_STEP_MINUTES * 60_000;
const BREAK_MS = BREAK_MINUTES * 60_000;

/** A slot or booking in epoch milliseconds: working time, then the break up to `end`. */
export type BlockedRange = { start: number; workEnd: number; end: number };

const stateAt = ({
  time,
  blocked,
  now,
}: {
  time: number;
  blocked: BlockedRange[];
  now: number;
}): Quarter["state"] => {
  const range = blocked.find(({ start, end }) => time >= start && time < end);
  if (range) return time < range.workEnd ? "occupied" : "break";
  // A new slot ending here would need its break where the next slot or booking already starts.
  const beforeNext = blocked.some(({ start }) => time >= start - BREAK_MS && time < start);
  if (beforeNext) return "break";
  const state = time <= now ? "past" : "free";

  return state;
};

/** Every quarter-hour from `from` up to `to`, with its state. */
export const buildQuarters = ({
  from,
  to,
  blocked,
  now,
}: {
  from: number;
  to: number;
  blocked: BlockedRange[];
  now: number;
}) => {
  const quarters: Quarter[] = Array.from({ length: (to - from) / STEP_MS }, (_, index) => {
    const time = from + index * STEP_MS;
    const quarter = {
      start: new Date(time).toISOString(),
      end: new Date(time + STEP_MS).toISOString(),
      state: stateAt({ time, blocked, now }),
    };

    return quarter;
  });

  return quarters;
};
