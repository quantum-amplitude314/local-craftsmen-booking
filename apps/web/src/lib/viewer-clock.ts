import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { dayReader, type ViewerClock } from "@/lib/booking-calendar-model";

const FALLBACK_TIME_ZONE = "Europe/Prague";

const readConnectionTimeZone = async () => {
  try {
    const { cf } = await getCloudflareContext({ async: true });

    return cf?.timezone;
  } catch {
    // Outside a Worker there is no connection to read one from.
    return undefined;
  }
};

/**
 * Where the reader most likely is, taken from the connection. Only the first paint depends on it:
 * the browser knows its own zone and corrects this before anything is shown.
 */
export const getViewerClock = async () => {
  const timeZone = (await readConnectionTimeZone()) ?? FALLBACK_TIME_ZONE;
  const loadedAt = new Date();
  const clock: ViewerClock = {
    timeZone,
    today: dayReader(timeZone)(loadedAt),
    // Whether a job is already over is decided once, when the page is built.
    now: loadedAt.toISOString(),
  };

  return clock;
};
