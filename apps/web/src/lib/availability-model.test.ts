import { describe, expect, test } from "bun:test";
import type { Area, AvailabilityDay, CityId, Location } from "@local-craftsmen/contracts";
import { prepareAvailability } from "./availability-model";

const quarter = ({ start, end }: { start: string; end: string }) => ({
  start,
  end,
  state: "free" as const,
});

const scheduleIn = ({ cityId, zoneId }: { cityId: CityId; zoneId: string }) => {
  const schedule: AvailabilityDay = {
    timeZone: { id: zoneId, cityId },
    date: "2040-07-02",
    today: "2040-07-01",
    quarters: [quarter({ start: "2040-07-01T22:00:00.000Z", end: "2040-07-01T22:15:00.000Z" })],
    nextDayQuarters: [],
    slots: [],
    slotDates: [],
  };

  return schedule;
};

const locations: Location[] = [
  { id: "prague", name: "Praha", districts: [{ id: "prague-liben", name: "Libeň" }] },
  { id: "pilsen", name: "Plzeň", districts: [{ id: "pilsen-doubravka", name: "Doubravka" }] },
];

const cityNames: Record<string, string> = { prague: "Prague", pilsen: "Pilsen" };

const prepare = ({ schedule, baseArea }: { schedule: AvailabilityDay; baseArea: Area }) =>
  prepareAvailability({
    schedule,
    locations,
    baseArea,
    locale: "en-GB",
    text: {
      cityName: (cityId) => cityNames[cityId] ?? cityId,
      zoneNote: ({ city, zone }) => `${city} time, ${zone}`,
      hints: { pickRange: "Pick a range", tooShort: "Too short", tooLong: "Too long" },
      errors: {
        invalid: "Invalid",
        occupied: "Occupied",
        saveFailed: "Save failed",
        unauthorized: "Unauthorized",
      },
      saved: "Saved",
    },
  });

describe("prepared availability", () => {
  test("covers the city the day was read in, keeping the base district at home", () => {
    const baseArea: Area = { cityId: "prague", districtId: "prague-liben" };
    const home = prepare({
      schedule: scheduleIn({ cityId: "prague", zoneId: "Europe/Prague" }),
      baseArea,
    });
    expect(home.draftArea).toEqual({ cityId: "prague", districtId: "prague-liben" });

    const away = prepare({
      schedule: scheduleIn({ cityId: "pilsen", zoneId: "Europe/Prague" }),
      baseArea,
    });
    expect(away.draftArea).toEqual({ cityId: "pilsen", districtId: "" });
  });

  test("labels the hours in the schedule's zone, not the browser's", () => {
    const abroad = prepare({
      schedule: scheduleIn({ cityId: "prague", zoneId: "America/New_York" }),
      baseArea: { cityId: "prague", districtId: null },
    });
    expect(abroad.quarters[0]?.label).toBe("18:00");
    expect(abroad.zoneNote).toBe("Prague time, GMT-4");

    const athome = prepare({
      schedule: scheduleIn({ cityId: "prague", zoneId: "Europe/Prague" }),
      baseArea: { cityId: "prague", districtId: null },
    });
    expect(athome.quarters[0]?.label).toBe("00:00");
    expect(athome.zoneNote).toBe("Prague time, CEST");
  });
});
