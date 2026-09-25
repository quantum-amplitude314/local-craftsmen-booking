"use client";

import { useLocale } from "next-intl";
import { startTransition, useCallback, useOptimistic } from "react";
import { cs, enGB } from "react-day-picker/locale";
import type { ScheduleCalendarModel } from "@/lib/schedule-calendar-model";

export type ScheduleCalendarProps = {
  calendar: ScheduleCalendarModel;
  /** Bookings look backwards; offered availability only forwards. */
  allowPast?: boolean;
  onSelect: (date: string) => void;
};

const daysToBlock = ({ allowPast, today }: { allowPast: boolean; today: Date }) =>
  allowPast ? undefined : { before: today };

/** Only interaction state lives here; the server supplies the calendar's dates. */
export const useScheduleCalendar = ({
  calendar,
  allowPast = false,
  onSelect,
}: ScheduleCalendarProps) => {
  const locale = useLocale();
  const { selected: confirmedDay, today, markedDays } = calendar;
  const [selected, selectOptimistically] = useOptimistic(confirmedDay);
  const selectDay = useCallback(
    (day: Date) => {
      startTransition(() => {
        selectOptimistically(day);
        onSelect(day.toISOString().slice(0, 10));
      });
    },
    [onSelect, selectOptimistically],
  );
  const calendarProps = {
    selected,
    today,
    defaultMonth: confirmedDay,
    disabled: daysToBlock({ allowPast, today }),
    modifiers: { marked: markedDays },
    locale: locale === "cs" ? cs : enGB,
    onSelect: selectDay,
  };

  return calendarProps;
};
