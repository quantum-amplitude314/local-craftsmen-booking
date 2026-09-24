import {
  createBookingsService,
  createCraftsmenService,
  createLocationsService,
  createSlotsService,
} from "@local-craftsmen/application";
import { createDb } from "@local-craftsmen/db";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";
import { parseWorkerEnv } from "./env.ts";

const app = createApp<Env>({
  createApiContext: ({ bindings }) => {
    const { HYPERDRIVE: hyperdrive } = bindings;
    const { BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, TURNSTILE_SECRET_KEY } =
      parseWorkerEnv(bindings);
    const { db } = createDb({
      connectionString: hyperdrive.connectionString,
      fetchTypes: false,
      maxConnections: 5,
      prepareStatements: false,
    });
    const apiContext = {
      craftsmen: createCraftsmenService({ db }),
      slots: createSlotsService({ db }),
      bookings: createBookingsService({ db }),
      locations: createLocationsService({ db }),
      getAuth: () =>
        createAuth({
          db,
          secret: BETTER_AUTH_SECRET,
          baseURL: BETTER_AUTH_URL,
          webOrigin: WEB_ORIGIN,
          turnstileSecretKey: TURNSTILE_SECRET_KEY,
        }),
    };

    return apiContext;
  },
});

export default app;
