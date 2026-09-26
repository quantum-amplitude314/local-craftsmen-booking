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
import type { DaySlotModel } from "@/lib/availability-model";
import { useMutation } from "@/lib/use-mutation";

const initialState: DeleteSlotState = {};
/** Rows shown before the rest collapse: as many as stand beside the calendar, plus the show-more line. */
const VISIBLE_SLOTS = 6;

function DaySlotItem({ slot }: { slot: DaySlotModel }) {
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
        <ItemDescription className="line-clamp-none">{areaLabel}</ItemDescription>
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

export function AvailabilityDaySlots({ slots }: { slots: DaySlotModel[] }) {
  const t = useTranslations("dashboard.availability");
  const [expanded, setExpanded] = useState(false);
  const visible = slots.slice(0, VISIBLE_SLOTS);
  const hidden = slots.slice(VISIBLE_SLOTS);

  // min-h-103: six rows and the show-more line, so the list keeps the calendar's height.
  return (
    <div className="flex min-h-103 min-w-0 flex-1 flex-col gap-2">
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
    </div>
  );
}
