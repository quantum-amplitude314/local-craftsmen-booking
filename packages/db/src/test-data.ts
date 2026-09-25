import type { Db } from "./client.ts";
import { availability, availabilityArea, craftsmanProfile, craftsmanRate, user } from "./schema.ts";

const HOUR_MS = 3_600_000;
const BREAK_MS = 15 * 60_000;
const tomorrowAt = (utcHour: number) => {
  const tomorrow = new Date(Date.now() + 24 * HOUR_MS);
  const time = new Date(tomorrow.setUTCHours(utcHour, 0, 0, 0));

  return time;
};

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
        // 4 hours of work plus the fixed break the API stores after every slot.
        range: { start: tomorrowAt(7), end: new Date(tomorrowAt(11).getTime() + BREAK_MS) },
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
