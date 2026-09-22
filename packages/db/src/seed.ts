import { sql } from "drizzle-orm";
import { createDb, type Db } from "./client.ts";
import { runMigrations } from "./migrate.ts";
import { availability, craftsmanProfile, user } from "./schema.ts";

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000);

export const seedCraftsmen = [
  {
    id: "seed-painter-1",
    name: "Anna Paint",
    email: "anna@example.com",
    craft: "painter",
    baseCityId: "prague",
    baseOtherCityName: null,
    baseDistrict: "Libeň",
    hourlyRate: 45,
  },
  {
    id: "seed-painter-2",
    name: "Ben Brush",
    email: "ben@example.com",
    craft: "painter",
    baseCityId: "pilsen",
    baseOtherCityName: null,
    baseDistrict: null,
    hourlyRate: 50,
  },
  {
    id: "seed-plumber-1",
    name: "Cara Pipe",
    email: "cara@example.com",
    craft: "plumber",
    baseCityId: null,
    baseOtherCityName: "Kolín",
    baseDistrict: null,
    hourlyRate: 60,
  },
] as const;

export const seedCustomers = [
  { id: "seed-customer-1", name: "Dan Customer", email: "dan@example.com" },
] as const;

export const seed = async ({ db }: { db: Db }) => {
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
    seedCraftsmen.map(({ id, craft, baseCityId, baseOtherCityName, baseDistrict, hourlyRate }) => ({
      userId: id,
      craft,
      baseCityId,
      baseOtherCityName,
      baseDistrict,
      hourlyRate,
    })),
  );

  await db.insert(availability).values(
    seedCraftsmen.map(({ id }) => ({
      craftsmanId: id,
      range: { start: hoursFromNow(24), end: hoursFromNow(32) },
    })),
  );
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
