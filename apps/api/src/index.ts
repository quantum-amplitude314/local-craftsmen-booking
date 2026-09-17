import { createCraftsmenService } from "@local-craftsmen/application";
import { createDb } from "@local-craftsmen/db";
import { createApp } from "./app.ts";

const app = createApp<Env>({
  createApiContext: ({ bindings }) => {
    const { HYPERDRIVE: hyperdrive } = bindings;
    const { db } = createDb({
      connectionString: hyperdrive.connectionString,
      fetchTypes: false,
      maxConnections: 5,
      prepareStatements: false,
    });
    const apiContext = { craftsmen: createCraftsmenService({ db }) };

    return apiContext;
  },
});

export default app;
