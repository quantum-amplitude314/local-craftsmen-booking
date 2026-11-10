import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

export const createDb = ({
  connectionString,
  maxConnections = 10,
}: {
  connectionString: string;
  maxConnections?: number;
}) => {
  const pool = new Pool({ connectionString, max: maxConnections });
  let closing = false;
  // Unhandled, an idle connection the server dropped would crash the process. Once closing,
  // workerd reports each socket the pool ends as "This socket has been closed".
  pool.on("error", ({ message: detail }) => {
    if (!closing)
      console.error(JSON.stringify({ message: "Idle database connection failed", detail }));
  });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  const close = () => {
    closing = true;
    return pool.end();
  };
  const database = { db, close };

  return database;
};

export type Db = ReturnType<typeof createDb>["db"];
