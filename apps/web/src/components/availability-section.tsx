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
        <ScheduleCalendar calendar={calendar} disabled={changing} onSelect={selectDay} />
      </div>
      <AvailabilityDaySlots key={date} slots={slots} />
    </div>
  );
}
