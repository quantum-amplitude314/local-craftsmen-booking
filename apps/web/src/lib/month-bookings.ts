import "server-only";

import { apiClient } from "@/lib/api";
import { getViewerClock } from "@/lib/viewer-clock";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The jobs a calendar page can possibly show: the month plus a day on each side, so the grid's
 * first and last cells are complete whichever zone the reader turns out to be in.
 */
export const getMonthBookings = async ({ day }: { day: string | undefined }) => {
  const clock = await getViewerClock();
  const selected = day ?? clock.today;
  const year = Number(selected.slice(0, 4));
  const month = Number(selected.slice(5, 7));
  const bookings = await apiClient.me.bookings.range({
    start: new Date(Date.UTC(year, month - 1, 1) - DAY_MS).toISOString(),
    end: new Date(Date.UTC(year, month, 1) + DAY_MS).toISOString(),
  });
  const page = { bookings, day: selected, clock };

  return page;
};
