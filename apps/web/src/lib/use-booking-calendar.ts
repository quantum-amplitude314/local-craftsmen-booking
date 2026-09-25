"use client";

import type { OwnBooking } from "@local-craftsmen/contracts";
import { useLayoutEffect, useState } from "react";
import {
  type BookingCalendarText,
  dayReader,
  prepareBookingCalendar,
  type ViewerClock,
} from "@/lib/booking-calendar-model";

const readViewerZone = () => {
  const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
  const zone = { timeZone, today: dayReader(timeZone)(new Date()) };

  return zone;
};

/**
 * The jobs arrive as moments in UTC and the grid is drawn on the reader's own clock. The server
 * guesses that clock from the connection; the browser knows it, so it corrects the guess before
 * the first paint, which is why nothing flashes.
 */
export const useBookingCalendar = ({
  bookings,
  day,
  clock,
  locale,
  text,
}: {
  bookings: OwnBooking[];
  day: string;
  clock: ViewerClock;
  locale: string;
  text: BookingCalendarText;
}) => {
  const [{ timeZone, today }, correctZone] = useState(clock);
  useLayoutEffect(() => {
    const viewer = readViewerZone();
    if (viewer.timeZone !== timeZone || viewer.today !== today) correctZone(viewer);
  }, [timeZone, today]);

  const model = prepareBookingCalendar({ bookings, day, today, timeZone, locale, text });

  return model;
};
