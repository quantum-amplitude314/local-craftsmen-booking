"use client";

import { useTranslations } from "next-intl";
import { startTransition, useOptimistic } from "react";
import { AvailabilityDaySlots } from "@/components/availability-day-slots";
import { FilterSelect } from "@/components/filter-select";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { FieldLabel } from "@/components/ui/field";
import type { AvailabilityModel } from "@/lib/availability-model";
import { useScheduleParams } from "@/lib/use-schedule-params";

export function AvailabilitySection({ availability }: { availability: AvailabilityModel }) {
  const t = useTranslations("dashboard.availability");
  const { date, calendar, slots, cities, draftArea } = availability;
  const { changing, selectDay, selectCity } = useScheduleParams();
  // The picked city shows at once and stays until the server answers with the day in its zone.
  const [cityId, showCity] = useOptimistic(draftArea.cityId);
  const changeCity = (value: string) =>
    startTransition(() => {
      showCity(value);
      selectCity(value);
    });

  return (
    // Calendar beside the list only when this column, not the viewport, has room for both.
    <div className="@container min-w-0">
      <div className="flex flex-col gap-6 @split:flex-row @split:items-start">
        {/* The city decides the zone the calendar's day is read in, so it stands above the calendar. */}
        <div className="flex w-full min-w-0 flex-col gap-4 @split:max-w-70">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3">
            <FieldLabel htmlFor="planner-city">{t("city")}</FieldLabel>
            <FilterSelect
              id="planner-city"
              options={cities}
              value={cityId}
              onValueChange={changeCity}
            />
          </div>
          <div className="w-full min-w-0 overflow-hidden rounded-xl border">
            <ScheduleCalendar calendar={calendar} onSelect={selectDay} />
          </div>
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
    </div>
  );
}
