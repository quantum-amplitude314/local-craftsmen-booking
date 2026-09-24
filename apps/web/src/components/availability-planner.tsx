"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { AvailabilityTimePicker } from "@/components/availability-time-picker";
import { OptionCombobox } from "@/components/option-combobox";
import { PendingButton } from "@/components/pending-button";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { AvailabilityModel, HintModel } from "@/lib/availability-model";
import { useSlotDraft } from "@/lib/use-slot-draft";

// The calendar and the location fields share the left column, the quarters and the summary the right.
const columns = "grid gap-6 sm:grid-cols-[minmax(18rem,1fr)_minmax(14rem,1fr)]";
const hintTones: Record<HintModel["tone"], string> = {
  muted: "text-muted-foreground",
  destructive: "text-destructive",
};

export function AvailabilityPlanner({ availability }: { availability: AvailabilityModel }) {
  const t = useTranslations("dashboard.availability");
  const { date, calendar, zoneNote, cities, districtsByCity } = availability;
  const {
    options,
    cityId,
    districtId,
    pending,
    changing,
    canSave,
    rangeLabel,
    hint,
    errorMessage,
    savedMessage,
    changeDay,
    pick,
    changeCity,
    changeDistrict,
    save,
  } = useSlotDraft({ availability });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className={columns}>
        <div className="min-w-0 overflow-hidden rounded-xl border">
          <ScheduleCalendar calendar={calendar} disabled={pending} onSelect={changeDay} />
          <p className="border-t p-3 text-center text-xs text-muted-foreground">{zoneNote}</p>
        </div>
        <AvailabilityTimePicker
          date={date}
          options={options}
          pending={pending || changing}
          onPick={pick}
        />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        aria-busy={pending}
        className={cn(columns, "items-end gap-y-4 border-t pt-5")}
      >
        {/* Two rows: City beside the range and hint, District beside the time zone and Save. */}
        <Field className="sm:col-start-1 sm:row-start-1">
          <FieldLabel htmlFor="slot-city">{t("city")}</FieldLabel>
          <OptionCombobox
            id="slot-city"
            options={cities}
            value={cityId}
            disabled={pending}
            placeholder={t("cityPlaceholder")}
            emptyLabel={t("noMatches")}
            onValueChange={changeCity}
          />
        </Field>
        <Field className="sm:col-start-1 sm:row-start-2">
          <FieldLabel htmlFor="slot-district">{t("district")}</FieldLabel>
          <OptionCombobox
            id="slot-district"
            options={districtsByCity[cityId] ?? []}
            value={districtId}
            disabled={pending || !cityId}
            clearable
            placeholder={t("districtPlaceholder")}
            emptyLabel={t("noMatches")}
            onValueChange={changeDistrict}
          />
        </Field>
        <div className="flex min-w-0 items-end justify-between gap-4 sm:col-start-2 sm:row-start-1">
          <p
            aria-live="polite"
            className="min-h-8 shrink-0 text-2xl font-semibold text-primary tabular-nums"
          >
            {rangeLabel}
          </p>
          <div aria-live="polite" className="min-w-0 text-right text-sm">
            <FieldError>{errorMessage}</FieldError>
            {hint ? <p className={hintTones[hint.tone]}>{hint.text}</p> : null}
            <p
              role="status"
              data-visible={!!savedMessage}
              className="text-primary opacity-0 transition-opacity duration-200 data-[visible=true]:opacity-100"
            >
              {savedMessage}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-end justify-end gap-4 sm:col-start-2 sm:row-start-2">
          <PendingButton
            type="submit"
            size="lg"
            pending={pending}
            disabled={!canSave}
            label={t("save")}
            pendingLabel={t("saving")}
          />
        </div>
      </form>
    </div>
  );
}
