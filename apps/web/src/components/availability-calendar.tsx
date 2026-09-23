"use client";

import { useLocale } from "next-intl";
import { cs, enGB } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";

/** Schedule dates are plain YYYY-MM-DD; the calendar only needs them as local calendar days. */
const toCalendarDate = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const calendarDate = new Date(year, month - 1, day);

  return calendarDate;
};

const fromCalendarDate = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

export function AvailabilityCalendar({
  date,
  today,
  slotDates,
  disabled,
  onSelect,
}: {
  date: string;
  today: string;
  slotDates: string[];
  disabled: boolean;
  onSelect: (date: string) => void;
}) {
  const locale = useLocale();
  const todayDate = toCalendarDate(today);

  return (
    <Calendar
      mode="single"
      required
      fixedWeeks
      selected={toCalendarDate(date)}
      today={todayDate}
      defaultMonth={toCalendarDate(date)}
      disabled={disabled ? true : { before: todayDate }}
      onSelect={(selected) => onSelect(fromCalendarDate(selected))}
      weekStartsOn={1}
      locale={locale === "cs" ? cs : enGB}
      modifiers={{ hasSlots: slotDates.map(toCalendarDate) }}
      modifiersClassNames={{
        hasSlots:
          "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-current",
      }}
      className="w-full [--cell-size:2.5rem]"
    />
  );
}
