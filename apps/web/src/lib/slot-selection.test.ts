/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { emptySelection, endsFrom, pickSlotTime } from "./slot-selection";

describe("slot selection", () => {
  test("offers ends from 1 hour after the start to the latest end, across midnight", () => {
    const ends = endsFrom({
      start: "2026-09-23T21:30:00.000Z",
      latestEnd: "2026-09-24T00:00:00.000Z",
    });
    expect(ends).toEqual([
      "2026-09-23T22:30:00.000Z",
      "2026-09-23T22:45:00.000Z",
      "2026-09-23T23:00:00.000Z",
      "2026-09-23T23:15:00.000Z",
      "2026-09-23T23:30:00.000Z",
      "2026-09-23T23:45:00.000Z",
      "2026-09-24T00:00:00.000Z",
    ]);
  });

  test("picks a start, completes it with a valid end, and clears on the start", () => {
    const start = "2026-09-23T08:00:00.000Z";
    const end = "2026-09-23T09:00:00.000Z";
    const started = pickSlotTime({ selection: emptySelection, time: start, ends: [] });
    expect(started).toEqual({ start, end: null });
    const complete = pickSlotTime({ selection: started, time: end, ends: [end] });
    expect(complete).toEqual({ start, end });
    expect(pickSlotTime({ selection: complete, time: start, ends: [end] })).toEqual(emptySelection);
  });

  test("restarts from a time that is not a valid end", () => {
    const selection = { start: "2026-09-23T08:00:00.000Z", end: null };
    const restarted = pickSlotTime({ selection, time: "2026-09-23T12:00:00.000Z", ends: [] });
    expect(restarted).toEqual({ start: "2026-09-23T12:00:00.000Z", end: null });
  });
});
