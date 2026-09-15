import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Db } from "./client.ts";

const migrationsFolder = new URL("../migrations", import.meta.url).pathname;

export const runMigrations = ({ db }: { db: Db }) => migrate(db, { migrationsFolder });
