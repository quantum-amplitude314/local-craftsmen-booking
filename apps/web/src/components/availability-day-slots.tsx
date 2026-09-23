"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { type DeleteSlotState, deleteSlot } from "@/app/availability-actions";
import { PendingButton } from "@/components/pending-button";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FieldError } from "@/components/ui/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { useMutation } from "@/lib/use-mutation";

export type DaySlot = { id: string; timeLabel: string; areaLabel: string };

const initialState: DeleteSlotState = {};
/** Rows shown before the rest collapse; the panel reserves room for them so days never change its height. */
const VISIBLE_SLOTS = 1;

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
    <Item role="listitem" size="xs" className="min-h-14 border-primary/20 bg-primary/10">
      <ItemContent className="gap-0.5">
        <ItemTitle className="min-h-5 tabular-nums">{timeLabel}</ItemTitle>
        <ItemDescription className="line-clamp-1">{areaLabel}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <PendingButton
          variant="ghost"
          size="xs"
          pending={pending}
          label={t("delete")}
          pendingLabel={t("deleting")}
          aria-label={t("deleteLabel", { time: timeLabel })}
          onClick={handleDelete}
        />
      </ItemActions>
      {error && <FieldError className="w-full">{t(`errors.${error}`)}</FieldError>}
    </Item>
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
  const [expanded, setExpanded] = useState(false);
  const visible = slots.slice(0, VISIBLE_SLOTS);
  const hidden = slots.slice(VISIBLE_SLOTS);

  // min-h-35: heading, one row and the show-more line, whether or not the day fills them.
  return (
    <section
      aria-labelledby="day-slots-heading"
      className="flex min-h-35 flex-col gap-2 border-t p-3"
    >
      <h3 id="day-slots-heading" className="min-h-5 text-sm font-medium">
        {dateLabel && t("daySlots", { date: dateLabel })}
      </h3>
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSlots")}</p>
      ) : (
        <ItemGroup>
          {visible.map((slot) => (
            <DaySlotItem key={slot.id} slot={slot} />
          ))}
        </ItemGroup>
      )}
      {hidden.length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded} className="flex flex-col gap-2">
          <CollapsibleContent>
            <ItemGroup>
              {hidden.map((slot) => (
                <DaySlotItem key={slot.id} slot={slot} />
              ))}
            </ItemGroup>
          </CollapsibleContent>
          <CollapsibleTrigger
            render={<Button type="button" variant="ghost" size="xs" className="self-start" />}
          >
            {expanded ? t("showLess") : t("showMore", { count: hidden.length })}
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </section>
  );
}
