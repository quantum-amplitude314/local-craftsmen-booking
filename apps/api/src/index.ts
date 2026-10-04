import {
  createBookingsService,
  createCraftsmenService,
  createLocationsService,
  createMailService,
  createSlotsService,
} from "@local-craftsmen/application";
import { createDb } from "@local-craftsmen/db";
import { createApp } from "./app.ts";
import { createAuth } from "./auth.ts";
import { parseWorkerEnv } from "./env.ts";
import { createResendTransport } from "./mail-transports.ts";
import { createTurnstile } from "./turnstile.ts";

const app = createApp<Env>({
  createApiContext: ({ bindings }) => {
    const { HYPERDRIVE: hyperdrive } = bindings;
    const {
      BETTER_AUTH_SECRET,
      BETTER_AUTH_URL,
      WEB_ORIGIN,
      TURNSTILE_SECRET_KEY,
      RESEND_API_KEY,
      CONTACT_SENDER_EMAIL,
      CONTACT_RECIPIENT_EMAIL,
    } = parseWorkerEnv(bindings);
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
      mail: createMailService({
        transport: createResendTransport({
          apiKey: RESEND_API_KEY,
          from: `Local Craftsmen <${CONTACT_SENDER_EMAIL}>`,
        }),
        contactRecipient: CONTACT_RECIPIENT_EMAIL,
      }),
      turnstile: createTurnstile({ secretKey: TURNSTILE_SECRET_KEY }),
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
