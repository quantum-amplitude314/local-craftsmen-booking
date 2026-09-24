import { defineConfig } from "drizzle-kit";
import { readDatabaseEnv } from "./src/env.ts";

const { DATABASE_URL: connectionString } = readDatabaseEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url: connectionString },
});
