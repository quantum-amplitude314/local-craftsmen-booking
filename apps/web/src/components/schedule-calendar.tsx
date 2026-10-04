"use client";

import { Calendar } from "@/components/ui/calendar";
import { type ScheduleCalendarProps, useScheduleCalendar } from "@/lib/use-schedule-calendar";
import { cn } from "@/lib/utils";
import styles from "./schedule-calendar.module.css";

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
        marked: cn(styles.dot),
        emphasized: cn(styles.dot, "[--dot-colour:var(--primary)]"),
      }}
      className="w-full [--cell-size:2rem] sm:[--cell-size:2.25rem]"
    />
  );
}
