"use client";

import { AvailabilityDaySlots } from "@/components/availability-day-slots";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import type { AvailabilityModel } from "@/lib/availability-model";
import { useScheduleParams } from "@/lib/use-schedule-params";

export function AvailabilitySection({ availability }: { availability: AvailabilityModel }) {
  const { date, calendar, slots } = availability;
  const { changing, selectDay } = useScheduleParams();

  return (
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
      <div className="w-full min-w-0 overflow-hidden rounded-xl border lg:max-w-80">
        <ScheduleCalendar calendar={calendar} onSelect={selectDay} />
      </div>
      {/* The calendar stays live so the latest click wins; the list fades only on a slow answer. */}
      <div
        aria-busy={changing}
        data-changing={changing || undefined}
        className="flex min-w-0 flex-1 transition-opacity data-changing:opacity-60 data-changing:delay-300"
      >
        <AvailabilityDaySlots key={date} slots={slots} />
      </div>
    </div>
  );
}
