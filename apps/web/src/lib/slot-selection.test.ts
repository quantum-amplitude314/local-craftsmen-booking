/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import type { Quarter } from "@local-craftsmen/contracts";
import { draftStatus, pickQuarter, selectedRange } from "./slot-selection";

const quarterAt = (minutes: number, state: Quarter["state"] = "free"): Quarter => ({
  start: new Date(Date.UTC(2040, 0, 1, 8, minutes)).toISOString(),
  end: new Date(Date.UTC(2040, 0, 1, 8, minutes + 15)).toISOString(),
  state,
});
// 08:00–10:00 free, a break at 10:00, then 10:15–11:00 free.
const quarters = [
  ...[0, 15, 30, 45, 60, 75, 90, 105].map((minutes) => quarterAt(minutes)),
  quarterAt(120, "break"),
  ...[135, 150, 165].map((minutes) => quarterAt(minutes)),
];
const at = (index: number) => quarters[index]?.start ?? "";

describe("quarter selection", () => {
  test("clicking each quarter or only the first and last gives the same range", () => {
    const stepByStep = [0, 1, 2, 3].reduce(
      (selection, index) => pickQuarter({ selection, time: at(index), quarters }),
      null as ReturnType<typeof pickQuarter>,
    );
    const firstAndLast = pickQuarter({
      selection: pickQuarter({ selection: null, time: at(3), quarters }),
      time: at(0),
      quarters,
    });
    expect(stepByStep).toEqual({ first: at(0), last: at(3) });
    expect(firstAndLast).toEqual(stepByStep);
    const range = selectedRange({ selection: stepByStep, quarters });
    expect(range).toMatchObject({ start: at(0), end: at(4) });
    expect(draftStatus({ range })).toBe("ready");
  });

  test("an edge keeps only the other edge, inside ends the range there, a lone quarter clears", () => {
    const selection = { first: at(0), last: at(2) };
    expect(pickQuarter({ selection, time: at(2), quarters })).toEqual({
      first: at(0),
      last: at(0),
    });
    expect(pickQuarter({ selection, time: at(0), quarters })).toEqual({
      first: at(2),
      last: at(2),
    });
    expect(pickQuarter({ selection, time: at(1), quarters })).toEqual({
      first: at(0),
      last: at(1),
    });
    expect(pickQuarter({ selection: { first: at(1), last: at(1) }, time: at(1), quarters })).toBe(
      null,
    );
  });

  test("starts over beyond a break, drops a selection that is no longer free, flags the limits", () => {
    expect(
      pickQuarter({ selection: { first: at(0), last: at(0) }, time: at(10), quarters }),
    ).toEqual({ first: at(10), last: at(10) });
    expect(selectedRange({ selection: { first: at(6), last: at(9) }, quarters })).toBeNull();
    const short = selectedRange({ selection: { first: at(0), last: at(1) }, quarters });
    expect(draftStatus({ range: short })).toBe("tooShort");
    const long = { start: at(0), end: "2040-01-01T12:15:00.000Z", quarters: new Set<string>() };
    expect(draftStatus({ range: long })).toBe("tooLong");
    expect(draftStatus({ range: null })).toBe("pickRange");
  });
});
