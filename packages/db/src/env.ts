import { z } from "zod";

const postgresUrl = z.url({ protocol: /^postgres(ql)?$/ });

/** Connection for scripts outside a Worker: migrations, seeds, clear, the Bun API entry. */
export const databaseEnvSchema = z.object({ DATABASE_URL: postgresUrl });

const testDatabaseEnvSchema = z.object({ TEST_DATABASE_URL: postgresUrl });

export const readDatabaseEnv = () => {
  const databaseEnv = databaseEnvSchema.parse(process.env);

  return databaseEnv;
};

export const readTestDatabaseEnv = () => {
  const testDatabaseEnv = testDatabaseEnvSchema.parse(process.env);

  return testDatabaseEnv;
};
