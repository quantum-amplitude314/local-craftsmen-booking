import { sql } from "drizzle-orm";
import { createDb, type Db } from "./client.ts";
import { readDatabaseEnv } from "./env.ts";

/** Drops all tables, data, and migration history; the next migration run starts from scratch. */
export const clearDb = async ({ db }: { db: Db }) => {
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
};

if (import.meta.main) {
  const { DATABASE_URL: connectionString } = readDatabaseEnv();
  const { db, close } = createDb({ connectionString });
  await clearDb({ db });
  await close();
  console.log(`cleared ${new URL(connectionString).hostname}`);
}
