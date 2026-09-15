import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export const createDb = ({
  connectionString,
  fetchTypes = true,
  maxConnections = 10,
  prepareStatements = true,
}: {
  connectionString: string;
  fetchTypes?: boolean;
  maxConnections?: number;
  prepareStatements?: boolean;
}) => {
  const sql = postgres(connectionString, {
    max: maxConnections,
    fetch_types: fetchTypes,
    prepare: prepareStatements,
    onnotice: () => {},
  });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  const close = (options?: { timeout?: number }) => sql.end(options);
  const database = { db, close };

  return database;
};

export type Db = ReturnType<typeof createDb>["db"];
