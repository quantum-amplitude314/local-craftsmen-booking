import { clearDb } from "./clear.ts";
import { createDb } from "./client.ts";
import { runMigrations } from "./migrate.ts";
import { seedReference } from "./seed-reference.ts";
import { seedTestData } from "./seed-test.ts";

const connectionString = process.env.TEST_DATABASE_URL;

export const startTestDb = async () => {
  if (!connectionString) throw new Error("TEST_DATABASE_URL is required to run db tests");
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
