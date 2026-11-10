import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { connection } from "next/server";
import { dayReader, type ViewerClock } from "@/lib/booking-calendar-model";

const FALLBACK_TIME_ZONE = "Europe/Prague";

/** The reader's likely clock, from the connection; `useBookingCalendar` corrects it. */
export const getViewerClock = async () => {
  await connection();
  const { cf } = await getCloudflareContext({ async: true });
  const timeZone = cf?.timezone ?? FALLBACK_TIME_ZONE;
  const clock: ViewerClock = { timeZone, today: dayReader(timeZone)(new Date()) };

  return clock;
};
