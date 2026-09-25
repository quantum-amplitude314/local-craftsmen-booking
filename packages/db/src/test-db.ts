import { clearDb } from "./clear.ts";
import { createDb } from "./client.ts";
import { readTestDatabaseEnv } from "./env.ts";
import { runMigrations } from "./migrate.ts";
import { seedReference } from "./seed-reference.ts";
import { seedTestData } from "./test-data.ts";

export const startTestDb = async () => {
  const { TEST_DATABASE_URL: connectionString } = readTestDatabaseEnv();
  const { hostname, pathname } = new URL(connectionString);
  if (!["localhost", "127.0.0.1"].includes(hostname) || !pathname.endsWith("_test")) {
    throw new Error("Tests only reset a local database whose name ends with _test");
  }
  if (connectionString === process.env.DATABASE_URL)
    throw new Error("Test and development databases must be separate");

  const { db, close } = createDb({ connectionString });
  await clearDb({ db });
  await runMigrations({ db });
  await seedReference({ db });
  await seedTestData({ db });

  return { db, stop: close };
};
