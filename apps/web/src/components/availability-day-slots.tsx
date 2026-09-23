"use client";

import { useTranslations } from "next-intl";
import { type DeleteSlotState, deleteSlot } from "@/app/availability-actions";
import { PendingButton } from "@/components/pending-button";
import { FieldError } from "@/components/ui/field";
import { useMutation } from "@/lib/use-mutation";

export type DaySlot = { id: string; timeLabel: string; areaLabel: string };

const initialState: DeleteSlotState = {};

function DaySlotItem({ slot }: { slot: DaySlot }) {
  const t = useTranslations("dashboard.availability");
  const { id, timeLabel, areaLabel } = slot;
  const { state, pending, run } = useMutation({
    action: deleteSlot,
    initialState,
    failureState: { error: "deleteFailed" },
  });
  const { error } = state;
  const handleDelete = () => run({ id });

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="min-h-5 text-sm font-medium tabular-nums">{timeLabel}</span>
        <span className="text-xs text-muted-foreground">{areaLabel}</span>
      </div>
      <PendingButton
        variant="ghost"
        size="sm"
        pending={pending}
        label={t("delete")}
        pendingLabel={t("deleting")}
        aria-label={t("deleteLabel", { time: timeLabel })}
        onClick={handleDelete}
      />
      {error && <FieldError className="w-full">{t(`errors.${error}`)}</FieldError>}
    </li>
  );
}

export function AvailabilityDaySlots({
  slots,
  dateLabel,
}: {
  slots: DaySlot[];
  dateLabel: string;
}) {
  const t = useTranslations("dashboard.availability");

  return (
    <section aria-labelledby="day-slots-heading" className="flex flex-col gap-3 border-t p-4">
      <h3 id="day-slots-heading" className="min-h-5 text-sm font-medium">
        {dateLabel && t("daySlots", { date: dateLabel })}
      </h3>
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSlots")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {slots.map((slot) => (
            <DaySlotItem key={slot.id} slot={slot} />
          ))}
        </ul>
      )}
    </section>
  );
}
