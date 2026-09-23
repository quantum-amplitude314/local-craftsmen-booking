import { sql } from "drizzle-orm";
import { createDb, type Db } from "./client.ts";
import { runMigrations } from "./migrate.ts";
import {
  availability,
  availabilityArea,
  city,
  craftsmanProfile,
  craftsmanRate,
  district,
  user,
} from "./schema.ts";

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000);

export const seedCities = [
  { id: "prague", name: "Praha" },
  { id: "pilsen", name: "Plzeň" },
  { id: "pardubice", name: "Pardubice" },
] as const;

export const seedDistricts = [
  { id: "prague-holesovice", cityId: "prague", name: "Holešovice" },
  { id: "prague-liben", cityId: "prague", name: "Libeň" },
  { id: "prague-dolni-chabry", cityId: "prague", name: "Dolní Chabry" },
  { id: "pilsen-doubravka", cityId: "pilsen", name: "Doubravka" },
  { id: "pilsen-bory", cityId: "pilsen", name: "Bory" },
  { id: "pilsen-slovany", cityId: "pilsen", name: "Slovany" },
  { id: "pardubice-polabiny", cityId: "pardubice", name: "Polabiny" },
  { id: "pardubice-dubina", cityId: "pardubice", name: "Dubina" },
  { id: "pardubice-rosice", cityId: "pardubice", name: "Rosice" },
] as const;

export const seedCraftsmen = [
  {
    id: "seed-painter-1",
    name: "Anna Paint",
    email: "anna@example.com",
    craft: "painter",
    baseCityId: "prague",
    baseDistrictId: "prague-liben",
    rates: [
      { currency: "CZK", hourlyRate: "250" },
      { currency: "EUR", hourlyRate: "10" },
    ],
  },
  {
    id: "seed-painter-2",
    name: "Ben Brush",
    email: "ben@example.com",
    craft: "painter",
    baseCityId: "pilsen",
    baseDistrictId: "pilsen-doubravka",
    rates: [
      { currency: "CZK", hourlyRate: "400" },
      { currency: "EUR", hourlyRate: "18" },
    ],
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

export const seed = async ({ db }: { db: Db }) => {
  await db.insert(city).values([...seedCities]);
  await db.insert(district).values([...seedDistricts]);
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

const hasMigrations = async ({ db }: { db: Db }) => {
  const rows = await db.execute(sql`select 1 from pg_namespace where nspname = 'drizzle'`);
  const migrated = rows.length > 0;

  return migrated;
};

if (import.meta.main) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const { db, close } = createDb({ connectionString });
  if (await hasMigrations({ db })) {
    await close();
    throw new Error("Database is not empty. Run `bun run db:clear` first.");
  }

  await runMigrations({ db });
  await seed({ db });
  await close();
  console.log("seeded");
}
