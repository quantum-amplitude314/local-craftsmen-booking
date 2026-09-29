"use client";

import type { OwnBooking } from "@local-craftsmen/contracts";
import { useLayoutEffect, useState } from "react";
import {
  type BookingCalendarText,
  dayReader,
  prepareBookingCalendar,
  type ViewerClock,
} from "@/lib/booking-calendar-model";

const readViewerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const readViewerZone = () => {
  const timeZone = readViewerTimeZone();
  const zone = { timeZone, today: dayReader(timeZone)(new Date()) };

  return zone;
};

/** The viewer's local date of an instant: the day the bookings calendar files a job under. */
export const viewerDayOf = (instant: string) => dayReader(readViewerTimeZone())(new Date(instant));

/**
 * Jobs arrive as UTC instants. Each card shows its hours on the job city's clock; the day it sits
 * under, and today, follow the viewer's clock. The server guesses that clock from the connection
 * and the browser corrects it before the first paint, so nothing flashes.
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
