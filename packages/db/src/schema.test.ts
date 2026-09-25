import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { availability, availabilityArea, craftsmanProfile, craftsmanRate } from "./schema.ts";
import { seedCraftsmen } from "./test-data.ts";
import { startTestDb } from "./test-db.ts";

const at = (hour: number) => new Date(Date.UTC(2030, 0, 1, hour));
const craftsmanId = seedCraftsmen[0].id;

const readViolatedConstraint = (query: { execute: () => Promise<unknown> }) =>
  query.execute().then(
    () => null,
    (error: Error & { cause?: { constraint_name?: string } }) => error.cause?.constraint_name,
  );

let testDb: Awaited<ReturnType<typeof startTestDb>>;

beforeAll(async () => {
  testDb = await startTestDb();
});

afterAll(() => testDb.stop());

describe("availability exclusion constraint", () => {
  test("rejects overlapping ranges for the same craftsman", async () => {
    await testDb.db
      .insert(availability)
      .values({ craftsmanId, range: { start: at(8), end: at(12) } });

    const overlapping = testDb.db
      .insert(availability)
      .values({ craftsmanId, range: { start: at(11), end: at(13) } });
    const violatedConstraint = await readViolatedConstraint(overlapping);

    expect(violatedConstraint).toBe("availability_no_overlap");
  });

  test("accepts adjacent ranges", async () => {
    await testDb.db
      .insert(availability)
      .values({ craftsmanId, range: { start: at(12), end: at(14) } });
    const rows = await testDb.db
      .select()
      .from(availability)
      .where(eq(availability.craftsmanId, craftsmanId));

    expect(rows).toHaveLength(3);
    expect(rows[0]?.range.start).toBeInstanceOf(Date);
  });
});

describe("canonical locations", () => {
  test("rejects a profile district belonging to a different city", async () => {
    const wrongCity = testDb.db
      .update(craftsmanProfile)
      .set({ baseDistrictId: "pilsen-doubravka" })
      .where(eq(craftsmanProfile.userId, craftsmanId));

    expect(await readViolatedConstraint(wrongCity)).toBe("profile_district_city_fk");
  });

  test("enforces denormalized city consistency and unique whole-city coverage", async () => {
    const [slot] = await testDb.db
      .select({ id: availability.id })
      .from(availability)
      .where(eq(availability.craftsmanId, craftsmanId));
    if (!slot) throw new Error("Missing slot");
    const { id: availabilityId } = slot;
    const wrongCity = testDb.db
      .insert(availabilityArea)
      .values({ availabilityId, cityId: "pilsen", districtId: "prague-liben" });
    expect(await readViolatedConstraint(wrongCity)).toBe("availability_area_district_city_fk");
    await testDb.db
      .insert(availabilityArea)
      .values({ availabilityId, cityId: "pardubice", districtId: null });
    const duplicate = testDb.db
      .insert(availabilityArea)
      .values({ availabilityId, cityId: "pardubice", districtId: null });
    expect(await readViolatedConstraint(duplicate)).toBe("availability_area_unique");
  });
});

describe("craftsman prices", () => {
  test("stores exact fractional amounts independently of v1 input rules", async () => {
    const [price] = await testDb.db
      .insert(craftsmanRate)
      .values({ craftsmanId, currency: "USD", hourlyRate: "12.50" })
      .returning({ hourlyRate: craftsmanRate.hourlyRate });
    expect(price?.hourlyRate).toBe("12.50");
  });

  test("allows only one price per craftsman and currency", async () => {
    const duplicate = testDb.db
      .insert(craftsmanRate)
      .values({ craftsmanId, currency: "CZK", hourlyRate: "300" });
    expect(await readViolatedConstraint(duplicate)).toBe("craftsman_rate_craftsman_id_currency_pk");
  });

  test("rejects nonpositive prices", async () => {
    const invalid = testDb.db
      .insert(craftsmanRate)
      .values({ craftsmanId, currency: "PLN", hourlyRate: "0" });
    expect(await readViolatedConstraint(invalid)).toBe("craftsman_rate_positive");
  });
});
