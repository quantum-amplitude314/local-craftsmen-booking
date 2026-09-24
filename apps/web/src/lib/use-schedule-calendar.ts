"use client";

import { useLocale } from "next-intl";
import { startTransition, useCallback, useOptimistic } from "react";
import { cs, enGB } from "react-day-picker/locale";
import type { ScheduleCalendarModel } from "@/lib/schedule-calendar-model";

export type ScheduleCalendarProps = {
  calendar: ScheduleCalendarModel;
  disabled?: boolean;
  /** Bookings look backwards; offered availability only forwards. */
  allowPast?: boolean;
  onSelect: (date: string) => void;
};

const daysToBlock = ({
  disabled,
  allowPast,
  today,
}: {
  disabled: boolean;
  allowPast: boolean;
  today: Date;
}) => {
  if (disabled) return true;
  if (allowPast) return undefined;

  return { before: today };
};

/** Only interaction state lives here; the server supplies the calendar's dates. */
export const useScheduleCalendar = ({
  calendar,
  disabled = false,
  allowPast = false,
  onSelect,
}: ScheduleCalendarProps) => {
  const locale = useLocale();
  const { selected: confirmedDay, today, markedDays } = calendar;
  const [selected, selectOptimistically] = useOptimistic(confirmedDay);
  const selectDay = useCallback(
    (day: Date) => {
      if (disabled) return;
      startTransition(() => {
        selectOptimistically(day);
        onSelect(day.toISOString().slice(0, 10));
      });
    },
    [disabled, onSelect, selectOptimistically],
  );
  const calendarProps = {
    selected,
    today,
    defaultMonth: confirmedDay,
    disabled: daysToBlock({ disabled, allowPast, today }),
    modifiers: { marked: markedDays },
    locale: locale === "cs" ? cs : enGB,
    onSelect: selectDay,
  };

  return calendarProps;
};
