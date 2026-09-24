import { describe, expect, test } from "bun:test";
import { emptySlotFilters, readSlotFilters, slotFilterQuery } from "@/lib/slot-filters";

describe("slot filters", () => {
  test("reads valid URL values into API and form shapes", () => {
    const result = readSlotFilters({
      params: {
        craft: "painter",
        city: "prague",
        district: "prague-liben",
        date: "2040-02-02",
      },
    });

    expect(result).toEqual({
      search: {
        craft: "painter",
        cityId: "prague",
        districtId: "prague-liben",
        date: "2040-02-02",
      },
      filters: {
        craft: "painter",
        cityId: "prague",
        districtId: "prague-liben",
        date: "2040-02-02",
      },
    });
  });

  test("drops invalid URL values instead of sending them to the API", () => {
    const result = readSlotFilters({
      params: { craft: "wizard", city: "unknown", district: "somewhere", date: "tomorrow" },
    });

    expect(result).toEqual({ search: {}, filters: emptySlotFilters });
  });

  test("writes only active filters and never keeps a district without its city", () => {
    const query = slotFilterQuery({
      filters: { craft: "plumber", cityId: "", districtId: "prague-liben", date: "2040-02-02" },
    });

    expect(query).toEqual({ craft: "plumber", date: "2040-02-02" });
  });
});
