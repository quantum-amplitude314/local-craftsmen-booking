import { startTestDb } from "@local-craftsmen/db/test-db";
import { $ } from "bun";

const port = "3002";
const baseUrl = `http://localhost:${port}`;
const reportPath = "../test-results/bruno-report.json";
const startupTimeoutMs = 10_000;

const resetTestDb = async () => {
  const { stop } = await startTestDb();
  await stop();
};

const isHealthy = async () => {
  try {
    const response = await fetch(`${baseUrl}/health`);

    return response.ok;
  } catch {
    return false;
  }
};

const waitUntilHealthy = async () => {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) return;
    await Bun.sleep(200);
  }

  throw new Error(`API did not become healthy at ${baseUrl}`);
};

const { TEST_DATABASE_URL } = process.env;
if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");

await resetTestDb();

// NODE_ENV=test makes Bun load .env.test instead of .env.local, so real keys never reach this run.
const api = Bun.spawn(["bun", "src/bun.ts"], {
  env: {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    PORT: port,
    BETTER_AUTH_URL: baseUrl,
  },
  stdout: "ignore",
  stderr: "inherit",
});

try {
  await waitUntilHealthy();
  const { exitCode } =
    await $`bru run --env local --env-var baseUrl=${baseUrl} --reporter-json ${reportPath}`
      .cwd("bruno")
      .nothrow();
  process.exitCode = exitCode;
} finally {
  api.kill();
  await api.exited;
}
