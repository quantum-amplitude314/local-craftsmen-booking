import {
  BREAK_MINUTES,
  SCHEDULE_STEP_MINUTES,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
  type SlotTime,
} from "@local-craftsmen/contracts";

const MINUTE_MS = 60_000;
const STEP_MS = SCHEDULE_STEP_MINUTES * MINUTE_MS;
const BREAK_MS = BREAK_MINUTES * MINUTE_MS;
const SLOT_MIN_MS = SLOT_MIN_MINUTES * MINUTE_MS;
const SLOT_MAX_MS = SLOT_MAX_MINUTES * MINUTE_MS;

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
}): SlotTime["state"] => {
  const range = blocked.find(({ start, end }) => time >= start && time < end);
  if (range) return time < range.workEnd ? "occupied" : "break";
  const state = time <= now ? "past" : "free";

  return state;
};

/** Up to 4 hours, keeping the break before the next occupied time; null when not even 1 hour fits. */
const latestEndFrom = ({ time, blocked }: { time: number; blocked: BlockedRange[] }) => {
  const nextStart = Math.min(
    ...blocked.filter(({ start }) => start >= time).map(({ start }) => start),
  );
  const latest = Math.min(time + SLOT_MAX_MS, nextStart - BREAK_MS);
  const latestEnd = latest >= time + SLOT_MIN_MS ? new Date(latest).toISOString() : null;

  return latestEnd;
};

/** Every 15-minute step from `dayStart` up to `dayEnd`, with its state and where a slot from it may end. */
export const buildSlotTimes = ({
  dayStart,
  dayEnd,
  blocked,
  now,
}: {
  dayStart: number;
  dayEnd: number;
  blocked: BlockedRange[];
  now: number;
}) => {
  const times: SlotTime[] = Array.from({ length: (dayEnd - dayStart) / STEP_MS }, (_, index) => {
    const time = dayStart + index * STEP_MS;
    const state = stateAt({ time, blocked, now });
    const slotTime = {
      start: new Date(time).toISOString(),
      state,
      latestEnd: state === "free" ? latestEndFrom({ time, blocked }) : null,
    };

    return slotTime;
  });

  return times;
};
