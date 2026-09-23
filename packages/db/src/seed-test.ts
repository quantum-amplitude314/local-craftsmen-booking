import { eq } from "drizzle-orm";
import { createDb, type Db } from "./client.ts";
import { runMigrations } from "./migrate.ts";
import { availability, availabilityArea, craftsmanProfile, craftsmanRate, user } from "./schema.ts";
import { seedReference } from "./seed-reference.ts";

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000);

export const seedCraftsmen = [
  {
    id: "seed-painter-1",
    name: "Anna Paint",
    email: "anna@example.com",
    craft: "painter",
    baseCityId: "prague",
    baseDistrictId: "prague-liben",
    rates: [{ currency: "CZK", hourlyRate: "250" }],
  },
  {
    id: "seed-painter-2",
    name: "Ben Brush",
    email: "ben@example.com",
    craft: "painter",
    baseCityId: "pilsen",
    baseDistrictId: "pilsen-doubravka",
    rates: [{ currency: "CZK", hourlyRate: "400" }],
  },
  {
    id: "seed-plumber-1",
    name: "Cara Pipe",
    email: "cara@example.com",
    craft: "plumber",
    baseCityId: "pardubice",
    baseDistrictId: null,
    rates: [{ currency: "CZK", hourlyRate: "500" }],
  },
] as const;

export const seedCustomers = [
  { id: "seed-customer-1", name: "Dan Customer", email: "dan@example.com" },
] as const;

/** Demo craftsmen, a customer, rates and slots for local and test databases. Needs the reference seed first. */
export const seedTestData = async ({ db }: { db: Db }) => {
  await db.insert(user).values([
    ...seedCraftsmen.map(({ id, name, email }) => ({
      id,
      name,
      email,
      role: "craftsman" as const,
    })),
    ...seedCustomers.map(({ id, name, email }) => ({
      id,
      name,
      email,
      role: "customer" as const,
    })),
  ]);

  await db.insert(craftsmanProfile).values(
    seedCraftsmen.map(({ id, craft, baseCityId, baseDistrictId }) => ({
      userId: id,
      craft,
      baseCityId,
      baseDistrictId,
    })),
  );

  await db.insert(craftsmanRate).values(
    seedCraftsmen.flatMap(({ id, rates }) =>
      rates.map(({ currency, hourlyRate }) => ({
        craftsmanId: id,
        currency,
        hourlyRate,
      })),
    ),
  );

  const slots = await db
    .insert(availability)
    .values(
      seedCraftsmen.map(({ id }) => ({
        craftsmanId: id,
        range: { start: hoursFromNow(24), end: hoursFromNow(32) },
      })),
    )
    .returning({ id: availability.id, craftsmanId: availability.craftsmanId });
  for (const { id: availabilityId, craftsmanId } of slots) {
    const profile = seedCraftsmen.find(({ id }) => id === craftsmanId);
    if (!profile) throw new Error("Missing seeded profile");
    const { baseCityId } = profile;
    const districts = baseCityId === "prague" ? ["prague-holesovice", "prague-liben"] : [null];
    await db
      .insert(availabilityArea)
      .values(districts.map((districtId) => ({ availabilityId, cityId: baseCityId, districtId })));
  }
};

const hasTestData = async ({ db }: { db: Db }) => {
  const [firstCraftsman] = seedCraftsmen;
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, firstCraftsman.id));
  const seeded = rows.length > 0;

  return seeded;
};

if (import.meta.main) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!["localhost", "127.0.0.1"].includes(new URL(connectionString).hostname)) {
    throw new Error("db:seed:test only seeds a localhost database");
  }

  const { db, close } = createDb({ connectionString });
  await runMigrations({ db });
  await seedReference({ db });
  if (await hasTestData({ db })) {
    await close();
    throw new Error("Test data is already seeded. Run `bun run db:clear` first.");
  }

  await seedTestData({ db });
  await close();
  console.log("seeded reference and test data");
}
