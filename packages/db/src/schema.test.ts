import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { availability } from "./schema.ts";
import { seedCraftsmen } from "./seed.ts";
import { startTestDb } from "./test-db.ts";

const at = (hour: number) => new Date(Date.UTC(2030, 0, 1, hour));
const craftsmanId = seedCraftsmen[0].id;

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
    const violatedConstraint = await overlapping.execute().then(
      () => null,
      (error: Error & { cause?: { constraint_name?: string } }) => error.cause?.constraint_name,
    );

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
