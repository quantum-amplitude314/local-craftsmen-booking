import { createCraftsmenService } from "@local-craftsmen/application";
import { createDb } from "@local-craftsmen/db";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";

const app = createApp<Env>({
  createApiContext: ({ bindings }) => {
    const {
      HYPERDRIVE: hyperdrive,
      BETTER_AUTH_SECRET,
      BETTER_AUTH_URL,
      WEB_ORIGIN,
      TURNSTILE_SECRET_KEY,
    } = bindings;
    const { db } = createDb({
      connectionString: hyperdrive.connectionString,
      fetchTypes: false,
      maxConnections: 5,
      prepareStatements: false,
    });
    const apiContext = {
      craftsmen: createCraftsmenService({ db }),
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
