import { sql } from "drizzle-orm";
import locations from "../data/locations.json" with { type: "json" };
import { createDb, type Db } from "./client.ts";
import { city, district } from "./schema.ts";

const cities = locations.map(({ id, name }) => ({ id, name }));
const districts = locations.flatMap(({ id: cityId, districts }) =>
  districts.map(({ id, name }) => ({ id, cityId, name })),
);

/** Adds missing cities and districts and renames existing ones. Never deletes: profiles, slots and bookings reference them. */
export const seedReference = async ({ db }: { db: Db }) => {
  await db
    .insert(city)
    .values(cities)
    .onConflictDoUpdate({ target: city.id, set: { name: sql`excluded.name` } });
  await db
    .insert(district)
    .values(districts)
    .onConflictDoUpdate({ target: district.id, set: { name: sql`excluded.name` } });
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
  if (!(await hasMigrations({ db }))) {
    await close();
    throw new Error("Database has no migrations. Run `bun run db:migrate` first.");
  }

  await seedReference({ db });
  await close();
  console.log(`seeded ${cities.length} cities and ${districts.length} districts`);
}
