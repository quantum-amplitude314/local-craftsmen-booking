"use client";

import {
  type Area,
  type AvailabilityDay,
  cityIdSchema,
  type Location,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
} from "@local-craftsmen/contracts";
import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createSlot, type SlotFormState } from "@/app/availability-actions";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { AvailabilityDaySlots } from "@/components/availability-day-slots";
import { AvailabilityTimePicker, type QuarterOption } from "@/components/availability-time-picker";
import { OptionCombobox } from "@/components/option-combobox";
import { PendingButton } from "@/components/pending-button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import {
  pickQuarter,
  type QuarterSelection,
  rangeIssue,
  selectedRange,
} from "@/lib/slot-selection";
import { useMutation } from "@/lib/use-mutation";
import { useScheduleLabels } from "@/lib/use-schedule-labels";

const initialState: SlotFormState = {};
// The calendar and the location fields share the left column, the quarters and the summary the right.
const columns = "grid gap-6 sm:grid-cols-[minmax(18rem,1fr)_minmax(14rem,1fr)]";

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
  const [selection, setSelection] = useState<QuarterSelection>(null);
  const [cityId, setCityId] = useState<string>(baseArea.cityId);
  const [districtId, setDistrictId] = useState(baseArea.districtId ?? "");
  const { state, pending, run, clear } = useMutation({
    action: createSlot,
    initialState,
    failureState: { error: "saveFailed" },
  });

  const {
    timeZone,
    date,
    today,
    quarters: dayQuarters,
    nextDayQuarters,
    slots,
    slotDates,
  } = schedule;
  // The next day's first hours join the list once the selection reaches midnight.
  const lastDayQuarter = dayQuarters.at(-1)?.start ?? "";
  const quarters =
    selection && selection.last >= lastDayQuarter
      ? [...dayQuarters, ...nextDayQuarters]
      : dayQuarters;
  const range = selectedRange({ selection, quarters });
  const current = range ? selection : null;
  const issue = range ? rangeIssue({ range }) : null;
  const labels = useScheduleLabels({
    timeZone: timeZone.id,
    date,
    times: [
      ...new Set([
        ...[...dayQuarters, ...nextDayQuarters].flatMap(({ start, end }) => [start, end]),
        ...slots.flatMap(({ start, end }) => [start, end]),
      ]),
    ],
  });
  const timeLabel = (time: string) => labels?.times[time] ?? "";
  const rangeLabel = (time: { start: string; end: string }) =>
    labels ? `${timeLabel(time.start)} – ${timeLabel(time.end)}` : "";

  const options: QuarterOption[] = quarters.map(({ start, end, state }) => ({
    time: start,
    label: timeLabel(start),
    endLabel: timeLabel(end),
    state,
    selected: !!range?.quarters.has(start),
    edge: start === current?.first || start === current?.last,
  }));
  const areaLabel = ({ cityId, districtId }: Area) => {
    const districts = locations.find(({ id }) => id === cityId)?.districts ?? [];
    const district = districts.find(({ id }) => id === districtId);
    const label = [tCities(cityId), district?.name].filter(Boolean).join(" · ");

    return label;
  };
  const daySlots = slots.map(({ id, start, end, areas }) => ({
    id,
    timeLabel: rangeLabel({ start, end }),
    areaLabel: areas.map(areaLabel).join(", "),
  }));
  const cityOptions = locations.map(({ id }) => ({ value: id, label: tCities(id) }));
  const districtOptions = (locations.find(({ id }) => id === cityId)?.districts ?? []).map(
    ({ id, name }) => ({ value: id, label: name }),
  );
  const saveHint = !range
    ? t("pickRange")
    : issue === "tooShort"
      ? t("tooShort", { hours: SLOT_MIN_MINUTES / 60 })
      : issue === "tooLong"
        ? t("tooLong", { hours: SLOT_MAX_MINUTES / 60 })
        : null;
  const { error, saved } = state;

  const handleDaySelect = (nextDate: string) => {
    setSelection(null);
    clear();
    startDayChange(() =>
      router.replace({ pathname: "/dashboard", query: { day: nextDate } }, { scroll: false }),
    );
  };
  const handleQuarterPick = (time: string) => {
    setSelection(pickQuarter({ selection: current, time, quarters }));
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
    if (pending || !range || issue || !city.success) return;
    const { start, end } = range;
    run({ start, end, areas: [{ cityId: city.data, districtId: districtId || null }] });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className={columns}>
        <div className="min-w-0 overflow-hidden rounded-xl border">
          <AvailabilityCalendar
            date={date}
            today={today}
            slotDates={slotDates}
            disabled={pending || changingDay}
            onSelect={handleDaySelect}
          />
          <AvailabilityDaySlots key={date} slots={daySlots} dateLabel={labels?.date ?? ""} />
        </div>
        <AvailabilityTimePicker
          date={date}
          options={options}
          pending={pending || changingDay}
          onPick={handleQuarterPick}
        />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        aria-busy={pending}
        className={cn(columns, "items-end gap-y-4 border-t pt-5")}
      >
        {/* Two rows: City beside the range and hint, District beside the time zone and Save. */}
        <Field className="sm:col-start-1 sm:row-start-1">
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
        <Field className="sm:col-start-1 sm:row-start-2">
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
        <div className="flex min-w-0 items-end justify-between gap-4 sm:col-start-2 sm:row-start-1">
          <p
            aria-live="polite"
            className="min-h-8 shrink-0 text-2xl font-semibold text-primary tabular-nums"
          >
            {range ? rangeLabel(range) : null}
          </p>
          <div aria-live="polite" className="min-w-0 text-right text-sm">
            <FieldError>{error ? t(`errors.${error}`) : null}</FieldError>
            {!error && !saved && saveHint && (
              <p className={issue ? "text-destructive" : "text-muted-foreground"}>{saveHint}</p>
            )}
            <p
              role="status"
              data-visible={!pending && saved}
              className="text-primary opacity-0 transition-opacity duration-200 data-[visible=true]:opacity-100"
            >
              {!pending && saved ? t("saved") : null}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-end justify-between gap-4 sm:col-start-2 sm:row-start-2">
          <p className="min-w-0 text-xs text-muted-foreground">
            {labels && t("timeZone", { city: tCities(timeZone.cityId), zone: labels.zone })}
          </p>
          <PendingButton
            type="submit"
            size="lg"
            pending={pending}
            disabled={!range || !!issue || !cityId}
            label={t("save")}
            pendingLabel={t("saving")}
          />
        </div>
      </form>
    </div>
  );
}
