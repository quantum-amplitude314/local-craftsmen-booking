import { sql } from "drizzle-orm";
import { createDb } from "./client.ts";
import { runMigrations } from "./migrate.ts";
import { seed } from "./seed.ts";

const connectionString = process.env.TEST_DATABASE_URL;

export const startTestDb = async () => {
  if (!connectionString) throw new Error("TEST_DATABASE_URL is required to run db tests");

  const { db, close } = createDb({ connectionString });
  await runMigrations({ db });
  await db.execute(sql`truncate "booking", "availability", "craftsman_profile", "user" cascade`);
  await seed({ db });

  return { db, stop: close };
};
