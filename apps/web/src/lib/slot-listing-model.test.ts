import { describe, expect, it } from "bun:test";
import type { Location, SlotListing } from "@local-craftsmen/contracts";
import { prepareSlotListings } from "@/lib/slot-listing-model";

const locations: Location[] = [
  {
    id: "prague",
    name: "Praha",
    timeZone: "Europe/Prague",
    districts: [{ id: "prague-liben", name: "Libeň" }],
  },
];

const text = {
  craftName: () => "Painter",
  cityName: () => "Prague",
  wholeCity: (city: string) => `All of ${city}`,
  zoneNote: ({ city, zone }: { city: string; zone: string }) => `${city} (${zone})`,
  perHour: " / hour",
};

const slot: SlotListing = {
  id: "slot-1",
  craftsmanId: "craftsman-1",
  // 08:00–11:00 Prague time in July, three hours of work.
  start: "2026-07-01T06:00:00.000Z",
  end: "2026-07-01T09:00:00.000Z",
  areas: [{ cityId: "prague", districtId: "prague-liben" }],
  craftsman: {
    id: "craftsman-1",
    name: "Anna Paint",
    craft: "painter",
    rates: [{ currency: "CZK", hourlyRate: "250" }],
  },
};

const prepare = (listing: SlotListing = slot) => {
  const [card] = prepareSlotListings({ slots: [listing], locations, locale: "en-GB", text });
  if (!card) throw new Error("Expected a prepared card");

  return card;
};

describe("prepareSlotListings", () => {
  it("reads the slot on the clock of the city it is worked in", () => {
    const { whenLabel, zoneNote, placeLabel } = prepare();

    expect(whenLabel).toBe("Wed 1 Jul, 08:00 – 11:00");
    expect(zoneNote).toBe("Prague (Europe/Prague)");
    expect(placeLabel).toBe("Libeň");
  });

  it("offers every quarter-hour start that still leaves an hour of work", () => {
    const { starts } = prepare().booking;

    expect(starts.at(0)).toEqual({
      value: "2026-07-01T06:00:00.000Z",
      label: "08:00",
      maxMinutes: 180,
    });
    expect(starts.at(-1)).toEqual({
      value: "2026-07-01T08:00:00.000Z",
      label: "10:00",
      maxMinutes: 60,
    });
  });

  it("prices every length the slot can hold", () => {
    const { durations } = prepare().booking;
    // Currency formatting separates with a non-breaking space; the amount is what matters here.
    const priced = durations.map(({ minutes, priceLabels }) => ({
      minutes,
      price: priceLabels.CZK?.replace(/\s/g, " "),
    }));

    expect(durations).toHaveLength(9);
    expect(priced.at(0)).toEqual({ minutes: 60, price: "CZK 250" });
    expect(priced.at(1)).toEqual({ minutes: 75, price: "CZK 312.5" });
    expect(priced.at(-1)).toEqual({ minutes: 180, price: "CZK 750" });
  });

  it("names the whole city when a slot covers it undivided", () => {
    const { booking, placeLabel } = prepare({
      ...slot,
      areas: [{ cityId: "prague", districtId: null }],
    });

    expect(placeLabel).toBe("Prague");
    expect(booking.areas).toEqual([{ value: "", label: "All of Prague" }]);
  });
});
