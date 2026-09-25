"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { OptionCombobox } from "@/components/option-combobox";
import { PendingButton } from "@/components/pending-button";
import { QuarterGrid } from "@/components/quarter-grid";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import type { AvailabilityModel, HintModel } from "@/lib/availability-model";
import { useSlotDraft } from "@/lib/use-slot-draft";

const messageTones = {
  muted: "text-muted-foreground",
  destructive: "text-destructive",
  saved: "text-primary",
};

type Message = { text: string; tone: keyof typeof messageTones };

/** What break and taken quarters look like, since a grid cell has no room to say it. */
function QuarterLegend() {
  const t = useTranslations("dashboard.availability");

  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-sm border border-dashed border-input" />
        {t("states.break")}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-sm border border-input opacity-50" />
        {t("states.occupied")}
      </span>
    </p>
  );
}

/** The dialog for the day and city the dashboard has chosen: the quarters, the district, save. */
export function AvailabilityPlanner({ availability }: { availability: AvailabilityModel }) {
  const t = useTranslations("dashboard.availability");
  const { date, dayLabel, zoneNote, districtsByCity } = availability;
  const {
    options,
    cityId,
    districtId,
    pending,
    canSave,
    rangeLabel,
    hint,
    errorMessage,
    savedMessage,
    pick,
    changeDistrict,
    save,
  } = useSlotDraft({ availability });
  // One line under the range holds what matters most now, so the dialog keeps its height.
  const candidates: (Message | HintModel | null)[] = [
    errorMessage ? { text: errorMessage, tone: "destructive" } : null,
    savedMessage ? { text: savedMessage, tone: "saved" } : null,
    hint,
  ];
  const message = candidates.find((candidate) => candidate !== null) ?? null;

  return (
    // A dialog taller than the phone still has to reach its save button.
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t("save")}</DialogTitle>
        <DialogDescription>
          {dayLabel} · {zoneNote}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-w-0 flex-col gap-2">
        <QuarterGrid
          key={date}
          options={options}
          pending={pending}
          className="grid-cols-4 sm:grid-cols-8"
          onPick={pick}
        />
        <QuarterLegend />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        aria-busy={pending}
        className="grid gap-4 border-t pt-5 sm:grid-cols-2 sm:items-end"
      >
        <Field>
          <FieldLabel htmlFor="slot-district">{t("district")}</FieldLabel>
          <OptionCombobox
            id="slot-district"
            options={districtsByCity[cityId] ?? []}
            value={districtId}
            disabled={pending}
            clearable
            placeholder={t("districtPlaceholder")}
            emptyLabel={t("noMatches")}
            onValueChange={changeDistrict}
          />
        </Field>
        <div aria-live="polite" className="flex min-w-0 flex-col gap-1 sm:items-end">
          <p className="min-h-8 text-2xl font-semibold text-primary tabular-nums">{rangeLabel}</p>
          <p className={cn("min-h-5 text-sm", message && messageTones[message.tone])}>
            {message?.text}
          </p>
        </div>
        <DialogFooter className="sm:col-span-2">
          <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>
            {t("cancel")}
          </DialogClose>
          <PendingButton
            type="submit"
            pending={pending}
            disabled={!canSave}
            label={t("save")}
            pendingLabel={t("saving")}
          />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
