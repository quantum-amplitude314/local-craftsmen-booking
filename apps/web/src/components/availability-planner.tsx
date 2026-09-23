"use client";

import {
  type Area,
  type AvailabilityDay,
  cityIdSchema,
  type Location,
} from "@local-craftsmen/contracts";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createSlot, type SlotFormState } from "@/app/availability-actions";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { AvailabilityDaySlots } from "@/components/availability-day-slots";
import { AvailabilityTimePicker, type TimeOption } from "@/components/availability-time-picker";
import { OptionCombobox } from "@/components/option-combobox";
import { PendingButton } from "@/components/pending-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { emptySelection, endsFrom, pickSlotTime } from "@/lib/slot-selection";
import { useMutation } from "@/lib/use-mutation";
import { useScheduleLabels } from "@/lib/use-schedule-labels";

const initialState: SlotFormState = {};

export function AvailabilityPlanner({
  schedule,
  baseArea,
  locations,
}: {
  schedule: AvailabilityDay;
  baseArea: Area;
  locations: Location[];
}) {
  const t = useTranslations("dashboard.availability");
  const tCities = useTranslations("cities");
  const router = useRouter();
  const [changingDay, startDayChange] = useTransition();
  const [selection, setSelection] = useState(emptySelection);
  const [cityId, setCityId] = useState<string>(baseArea.cityId);
  const [districtId, setDistrictId] = useState(baseArea.districtId ?? "");
  const { state, pending, run, clear } = useMutation({
    action: createSlot,
    initialState,
    failureState: { error: "saveFailed" },
  });

  const { timeZone, date, today, times, slots, slotDates } = schedule;
  // A start that is gone from the day (another day, or just taken) no longer counts as picked.
  const pickedStart = times.find(({ start }) => start === selection.start);
  const latestEnd = pickedStart?.latestEnd ?? null;
  const start = latestEnd ? selection.start : null;
  const ends = start && latestEnd ? endsFrom({ start, latestEnd }) : [];
  const end = selection.end && ends.includes(selection.end) ? selection.end : null;
  const dayStarts = new Set(times.map(({ start }) => start));
  const endsAfterDay = ends.filter((time) => !dayStarts.has(time));
  const labels = useScheduleLabels({
    timeZone: timeZone.id,
    date,
    times: [
      ...times.map(({ start }) => start),
      ...endsAfterDay,
      ...slots.flatMap(({ start, end }) => [start, end]),
    ],
  });
  const timeLabel = (time: string | null) => (time && labels?.times[time]) ?? "";

  const options: TimeOption[] = [
    ...times,
    ...endsAfterDay.map((time) => ({ start: time, state: "free" as const, latestEnd: null })),
  ].map(({ start: time, state, latestEnd }) => ({
    time,
    label: timeLabel(time),
    state,
    enabled: start ? time === start || ends.includes(time) : latestEnd !== null,
    selected: time === start || time === end,
    inRange: !!start && !!end && time > start && time < end,
  }));
  const areaLabel = ({ cityId, districtId }: Area) => {
    const districts = locations.find(({ id }) => id === cityId)?.districts ?? [];
    const district = districts.find(({ id }) => id === districtId);
    const label = [tCities(cityId), district?.name].filter(Boolean).join(" · ");

    return label;
  };
  const daySlots = slots.map(({ id, start, end, areas }) => ({
    id,
    timeLabel: labels ? `${timeLabel(start)} – ${timeLabel(end)}` : "",
    areaLabel: areas.map(areaLabel).join(", "),
  }));
  const cityOptions = locations.map(({ id }) => ({ value: id, label: tCities(id) }));
  const districtOptions = (locations.find(({ id }) => id === cityId)?.districts ?? []).map(
    ({ id, name }) => ({ value: id, label: name }),
  );
  const { error, saved } = state;

  const handleDaySelect = (nextDate: string) => {
    setSelection(emptySelection);
    clear();
    startDayChange(() =>
      router.replace({ pathname: "/dashboard", query: { day: nextDate } }, { scroll: false }),
    );
  };
  const handleTimePick = (time: string) => {
    setSelection(pickSlotTime({ selection: { start, end }, time, ends }));
    clear();
  };
  const handleReset = () => {
    setSelection(emptySelection);
    clear();
  };
  const handleCityChange = (value: string) => {
    setCityId(value);
    setDistrictId("");
    clear();
  };
  const handleDistrictChange = (value: string) => {
    setDistrictId(value);
    clear();
  };
  const handleSave = () => {
    const city = cityIdSchema.safeParse(cityId);
    if (pending || !start || !end || !city.success) return;
    run({ start, end, areas: [{ cityId: city.data, districtId: districtId || null }] });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p className="min-h-5 text-sm text-muted-foreground">
        {labels && t("timeZone", { city: tCities(timeZone.cityId), zone: labels.zone })}
      </p>
      <div className="grid items-start gap-6 sm:grid-cols-[minmax(18rem,1fr)_minmax(14rem,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-xl border">
          <AvailabilityCalendar
            date={date}
            today={today}
            slotDates={slotDates}
            disabled={pending || changingDay}
            onSelect={handleDaySelect}
          />
          <AvailabilityDaySlots slots={daySlots} dateLabel={labels?.date ?? ""} />
        </div>
        <AvailabilityTimePicker
          date={date}
          options={options}
          startLabel={start ? timeLabel(start) : null}
          choosingEnd={!!start}
          pending={pending || changingDay}
          onPick={handleTimePick}
          onReset={handleReset}
        />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        aria-busy={pending}
        className="flex flex-col gap-5 border-t pt-5"
      >
        <p aria-live="polite" className="min-h-6 font-medium tabular-nums">
          {start && end
            ? `${timeLabel(start)} – ${timeLabel(end)}`
            : t(start ? "pickEnd" : "pickStart")}
        </p>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="slot-city">{t("city")}</FieldLabel>
            <OptionCombobox
              id="slot-city"
              options={cityOptions}
              value={cityId}
              disabled={pending}
              placeholder={t("cityPlaceholder")}
              emptyLabel={t("noMatches")}
              onValueChange={handleCityChange}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="slot-district">{t("district")}</FieldLabel>
            <OptionCombobox
              id="slot-district"
              options={districtOptions}
              value={districtId}
              disabled={pending || !cityId}
              clearable
              placeholder={t("districtPlaceholder")}
              emptyLabel={t("noMatches")}
              onValueChange={handleDistrictChange}
            />
          </Field>
        </FieldGroup>
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-h-6">
            <FieldError>{error ? t(`errors.${error}`) : null}</FieldError>
            <p
              role="status"
              data-visible={!pending && saved}
              className="text-sm text-primary opacity-0 transition-opacity duration-200 data-[visible=true]:opacity-100"
            >
              {!pending && saved ? t("saved") : null}
            </p>
          </div>
          <PendingButton
            type="submit"
            size="lg"
            pending={pending}
            disabled={!start || !end || !cityId}
            label={t("save")}
            pendingLabel={t("saving")}
          />
        </div>
      </form>
    </div>
  );
}
