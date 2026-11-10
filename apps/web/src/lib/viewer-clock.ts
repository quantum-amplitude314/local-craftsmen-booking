import "server-only";

import { connection } from "next/server";
import { dayReader, type ViewerClock } from "@/lib/booking-calendar-model";
import { getWorkerContext } from "@/lib/env";

const FALLBACK_TIME_ZONE = "Europe/Prague";

/** The reader's likely clock, from the connection; `useBookingCalendar` corrects it. */
export const getViewerClock = async () => {
  await connection();
  const context = await getWorkerContext();
  const timeZone = context?.cf?.timezone ?? FALLBACK_TIME_ZONE;
  const clock: ViewerClock = { timeZone, today: dayReader(timeZone)(new Date()) };

  return clock;
};
