import { describe, expect, test } from "bun:test";
import type { Location, SlotListing } from "@local-craftsmen/contracts";
import { prepareSlotOffer } from "@/lib/slot-offer-model";
import { firstFreeHour } from "@/lib/slot-selection";

const locations: Location[] = [
  {
    id: "prague",
    name: "Praha",
    timeZone: "Europe/Prague",
    districts: [{ id: "prague-liben", name: "Libeň" }],
  },
];

// 10:00–12:00 in Prague.
const slot: SlotListing = {
  id: "slot",
  craftsmanId: "seed-painter-1",
  start: "2040-07-01T08:00:00.000Z",
  end: "2040-07-01T10:00:00.000Z",
  areas: [{ cityId: "prague", districtId: "prague-liben" }],
  craftsman: {
    id: "seed-painter-1",
    name: "Pat Painter",
    craft: "painter",
    rates: [{ currency: "CZK", hourlyRate: "500.00" }],
  },
};

const text = {
  wholeCity: "Whole city",
  rate: (rate: string) => `${rate}/h`,
  window: ({ day, start, end }: { day: string; start: string; end: string }) =>
    `${day} ${start}–${end}`,
  price: ({ hours, rate, total }: { hours: string; rate: string; total: string }) =>
    `${hours} · ${rate} · ${total}`,
  empty: "No slots on this day.",
};

const quartersAt = (now: string) => {
  const { cards } = prepareSlotOffer({
    slots: [slot],
    locations,
    day: "2040-07-01",
    today: "2040-07-01",
    now,
    districtId: "",
    locale: "en-GB",
    text,
  });
  const quarters = cards[0]?.booking.quarters ?? [];

  return quarters;
};

describe("prepareSlotOffer", () => {
  test("offers every quarter of a slot that has not started", () => {
    const quarters = quartersAt("2040-07-01T07:00:00.000Z");

    expect(quarters).toHaveLength(8);
    expect(quarters.every(({ state }) => state === "free")).toBe(true);
    expect(firstFreeHour({ quarters })).toEqual({
      first: "2040-07-01T08:00:00.000Z",
      last: "2040-07-01T08:45:00.000Z",
    });
  });

  test("marks the quarters of a slot under way as past up to now, and preselects the next hour", () => {
    // 10:30 in Prague: the quarter starting now can no longer be booked either.
    const quarters = quartersAt("2040-07-01T08:30:00.000Z");

    expect(quarters.map(({ label, state }) => `${label} ${state}`)).toEqual([
      "10:00 past",
      "10:15 past",
      "10:30 past",
      "10:45 free",
      "11:00 free",
      "11:15 free",
      "11:30 free",
      "11:45 free",
    ]);
    expect(firstFreeHour({ quarters })).toEqual({
      first: "2040-07-01T08:45:00.000Z",
      last: "2040-07-01T09:30:00.000Z",
    });
  });
});
