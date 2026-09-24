import { describe, expect, test } from "bun:test";
import type { CraftsmanDetail, Location } from "@local-craftsmen/contracts";
import { prepareCraftsmanDetail } from "@/lib/craftsman-detail-model";

const locations: Location[] = [
  {
    id: "prague",
    name: "Praha",
    timeZone: "Europe/Prague",
    districts: [{ id: "prague-liben", name: "Libeň" }],
  },
];

const detail: CraftsmanDetail = {
  id: "craftsman-1",
  name: "Anna Paint",
  craft: "painter",
  baseArea: { cityId: "prague", districtId: "prague-liben" },
  rates: [{ currency: "CZK", hourlyRate: "250" }],
  bio: null,
  availability: [
    {
      id: "slot-1",
      craftsmanId: "craftsman-1",
      start: "2026-07-01T06:00:00.000Z",
      end: "2026-07-01T07:00:00.000Z",
      areas: [{ cityId: "prague", districtId: "prague-liben" }],
    },
  ],
};

const text = {
  craftName: () => "Painter",
  cityName: () => "Prague",
  wholeCity: (city: string) => `All of ${city}`,
  zoneNote: ({ city, zone }: { city: string; zone: string }) => `${city} (${zone})`,
  perHour: " / hour",
  noBio: "No introduction provided.",
  noRate: "Rate unavailable",
};

describe("prepareCraftsmanDetail", () => {
  test("prepares the profile and reuses the bookable slot model", () => {
    const model = prepareCraftsmanDetail({ detail, locations, locale: "en-GB", text });

    expect(model).toMatchObject({
      id: "craftsman-1",
      name: "Anna Paint",
      craftLabel: "Painter",
      baseAreaLabel: "Prague · Libeň",
      rateSuffix: " / hour",
      bio: "No introduction provided.",
    });
    expect(model.rateLabel.replace(/\s/g, " ")).toBe("CZK 250");
    expect(model.slots[0]).toMatchObject({
      craftsmanId: "craftsman-1",
      booking: { slotId: "slot-1", cityId: "prague" },
    });
  });
});
