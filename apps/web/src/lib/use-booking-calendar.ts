"use client";

import type { CraftsmanBooking } from "@local-craftsmen/contracts";
import { useLayoutEffect, useState } from "react";
import {
  type BookingCalendarText,
  dayReader,
  prepareBookingCalendar,
} from "@/lib/booking-calendar-model";

const readViewerClock = () => {
  const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
  const clock = { timeZone, today: dayReader(timeZone)(new Date()) };

  return clock;
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
  bookings: CraftsmanBooking[];
  day: string;
  clock: { timeZone: string; today: string };
  locale: string;
  text: BookingCalendarText;
}) => {
  const [{ timeZone, today }, correctClock] = useState(clock);
  useLayoutEffect(() => {
    const viewer = readViewerClock();
    if (viewer.timeZone !== timeZone || viewer.today !== today) correctClock(viewer);
  }, [timeZone, today]);

  const model = prepareBookingCalendar({ bookings, day, today, timeZone, locale, text });

  return model;
};
