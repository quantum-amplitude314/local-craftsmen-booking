import { sql } from "drizzle-orm";
import { createDb, type Db } from "./client.ts";

/** Drops all tables, data, and migration history; the next migration run starts from scratch. */
export const clearDb = async ({ db }: { db: Db }) => {
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
};

if (import.meta.main) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  // The README points DATABASE_URL at Neon for deployment migrations; never clear a remote database.
  if (new URL(connectionString).hostname !== "localhost") {
    throw new Error("db:clear only clears a localhost database");
  }

  const { db, close } = createDb({ connectionString });
  await clearDb({ db });
  await close();
  console.log("cleared");
}
