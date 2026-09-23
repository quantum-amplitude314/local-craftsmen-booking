import {
  createBookingsService,
  createCraftsmenService,
  createLocationsService,
  createSlotsService,
} from "@local-craftsmen/application";
import { createDb } from "@local-craftsmen/db";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";

type Database = ReturnType<typeof createDb>;
type Server = ReturnType<typeof Bun.serve>;

type LocalRuntime = typeof globalThis & {
  localCraftsmenDatabase?: Database;
  localCraftsmenServer?: Server;
  localCraftsmenShutdownHandler?: () => void;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port)) throw new Error("PORT must be an integer");

const runtime = globalThis as LocalRuntime;
const database = runtime.localCraftsmenDatabase ?? createDb({ connectionString: databaseUrl });
runtime.localCraftsmenDatabase = database;

const craftsmen = createCraftsmenService({ db: database.db });
const slots = createSlotsService({ db: database.db });
const bookings = createBookingsService({ db: database.db });
const locations = createLocationsService({ db: database.db });
const {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL = "http://localhost:3001",
  WEB_ORIGIN = "http://localhost:3000",
  TURNSTILE_SECRET_KEY,
} = process.env;
const auth = createAuth({
  db: database.db,
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  webOrigin: WEB_ORIGIN,
  turnstileSecretKey: TURNSTILE_SECRET_KEY,
});
const app = createApp<Record<string, never>>({
  createApiContext: () => {
    const apiContext = { craftsmen, slots, bookings, locations, getAuth: () => auth };

    return apiContext;
  },
});

const server = Bun.serve({ port, fetch: app.fetch });
runtime.localCraftsmenServer = server;

if (runtime.localCraftsmenShutdownHandler) {
  process.off("SIGINT", runtime.localCraftsmenShutdownHandler);
  process.off("SIGTERM", runtime.localCraftsmenShutdownHandler);
}

const shutdown = async () => {
  try {
    await runtime.localCraftsmenServer?.stop();
    await runtime.localCraftsmenDatabase?.close({ timeout: 0 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ message: "API shutdown failed", detail }));
    process.exit(1);
  }

  process.exit(0);
};

const shutdownHandler = () => void shutdown();
process.once("SIGINT", shutdownHandler);
process.once("SIGTERM", shutdownHandler);
runtime.localCraftsmenShutdownHandler = shutdownHandler;

console.log(JSON.stringify({ message: "API listening", url: server.url.toString() }));
