"use client";

import { Calendar } from "@/components/ui/calendar";
import { type ScheduleCalendarProps, useScheduleCalendar } from "@/lib/use-schedule-calendar";

/** A month calendar that marks the days with availability or bookings; past days are disabled. */
export function ScheduleCalendar(props: ScheduleCalendarProps) {
  const calendarProps = useScheduleCalendar(props);

  return (
    <Calendar
      mode="single"
      required
      fixedWeeks
      timeZone="UTC"
      {...calendarProps}
      weekStartsOn={1}
      modifiersClassNames={{
        marked:
          "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-current",
      }}
      className="w-full [--cell-size:2rem] sm:[--cell-size:2.5rem]"
    />
  );
}
