"use client";

import type { BookingTransition } from "@local-craftsmen/contracts";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { advanceBooking, type BookingActionState } from "@/app/booking-actions";
import { PendingButton } from "@/components/pending-button";
import { Badge } from "@/components/ui/badge";
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
import type { OwnBookingCardModel, OwnBookingsModel } from "@/lib/own-bookings-model";
import { useMutation } from "@/lib/use-mutation";

const initialState: BookingActionState = {};

function OwnBookingCard({
  id,
  whenLabel,
  partyName,
  placeLabel,
  statusLabel,
  statusVariant,
  actions,
  faded,
}: OwnBookingCardModel & { faded: boolean }) {
  const t = useTranslations("dashboard.bookings");
  const { state, pending, run } = useMutation({
    action: advanceBooking,
    initialState,
    failureState: { error: "advanceFailed" },
  });
  const { error } = state;
  const ask = (transition: BookingTransition) => run({ id, transition });

  return (
    <Item role="listitem" size="sm" className={faded ? "opacity-70" : undefined}>
      <ItemContent className="min-w-0">
        <ItemTitle className="text-base tabular-nums">{whenLabel}</ItemTitle>
        <ItemDescription>{partyName}</ItemDescription>
        <ItemDescription>{placeLabel}</ItemDescription>
      </ItemContent>
      <ItemActions>
        {actions.map(({ transition, label, pendingLabel }) => (
          <PendingButton
            key={transition}
            variant="ghost"
            size="xs"
            pending={pending}
            label={label}
            pendingLabel={pendingLabel}
            onClick={() => ask(transition)}
          />
        ))}
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </ItemActions>
      {error && <FieldError className="w-full">{t(`errors.${error}`)}</FieldError>}
    </Item>
  );
}

export function OwnBookingsList({ upcoming, past, emptyMessage }: OwnBookingsModel) {
  const t = useTranslations("dashboard.bookings");
  const [showPast, setShowPast] = useState(false);

  if (emptyMessage) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
      ) : (
        <ItemGroup>
          {upcoming.map((card) => (
            <OwnBookingCard key={card.id} {...card} faded={false} />
          ))}
        </ItemGroup>
      )}
      {past.length > 0 && (
        <Collapsible open={showPast} onOpenChange={setShowPast} className="flex flex-col gap-2">
          <CollapsibleContent>
            <ItemGroup>
              {past.map((card) => (
                <OwnBookingCard key={card.id} {...card} faded />
              ))}
            </ItemGroup>
          </CollapsibleContent>
          <CollapsibleTrigger
            render={<Button type="button" variant="ghost" size="xs" className="self-start" />}
          >
            {showPast ? t("hidePast") : t("showPast", { count: past.length })}
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
}
