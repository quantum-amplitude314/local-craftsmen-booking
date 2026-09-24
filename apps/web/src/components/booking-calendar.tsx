"use client";

import type { BookingTransition, CraftsmanBooking } from "@local-craftsmen/contracts";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { advanceBooking, type BookingActionState } from "@/app/booking-actions";
import { PendingButton } from "@/components/pending-button";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import type { BookingCardModel, ViewerClock } from "@/lib/booking-calendar-model";
import { formattingLocale } from "@/lib/intl-locale";
import { useBookingCalendar } from "@/lib/use-booking-calendar";
import { useMutation } from "@/lib/use-mutation";
import { useScheduleParams } from "@/lib/use-schedule-params";

const initialState: BookingActionState = {};

function BookingCard({
  id,
  timeLabel,
  customerName,
  placeLabel,
  priceLabel,
  statusLabel,
  statusVariant,
  cancellable,
  actions,
}: BookingCardModel) {
  const t = useTranslations("dashboard.bookings");
  const [asked, setAsked] = useState<BookingTransition | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const { state, pending, run } = useMutation({
    action: advanceBooking,
    initialState,
    failureState: { error: "advanceFailed" },
    // A failed cancel reports on the card, not in a dialog left hanging open.
    onResult: () => setConfirmingCancel(false),
  });
  const { error } = state;
  const ask = (transition: BookingTransition) => {
    setAsked(transition);
    run({ id, transition });
  };

  return (
    <Item role="listitem" size="sm" className="border-primary/20 bg-primary/10">
      <ItemHeader>
        <ItemTitle className="text-base tabular-nums">{timeLabel}</ItemTitle>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </ItemHeader>
      <ItemContent className="min-w-0 gap-0.5">
        <p className="truncate font-medium">{customerName}</p>
        <ItemDescription className="line-clamp-1">{placeLabel}</ItemDescription>
        <ItemDescription className="line-clamp-1 tabular-nums">{priceLabel}</ItemDescription>
      </ItemContent>
      {(cancellable || actions.length > 0) && (
        <ItemFooter className="justify-end">
          <ItemActions>
            {cancellable && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setConfirmingCancel(true)}
              >
                {t("cancelDialog.open")}
              </Button>
            )}
            {actions.map(({ transition, label, pendingLabel }) => (
              <PendingButton
                key={transition}
                size="sm"
                pending={pending && asked === transition}
                disabled={pending}
                label={label}
                pendingLabel={pendingLabel}
                onClick={() => ask(transition)}
              />
            ))}
          </ItemActions>
        </ItemFooter>
      )}
      <Dialog
        open={confirmingCancel}
        onOpenChange={(open) => {
          if (!pending) setConfirmingCancel(open);
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("cancelDialog.description", { customer: customerName, time: timeLabel })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>
              {t("cancelDialog.keep")}
            </DialogClose>
            <PendingButton
              variant="destructive"
              pending={pending}
              label={t("cancelDialog.confirm")}
              pendingLabel={t("actions.cancelPending")}
              onClick={() => ask("cancel")}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error && <FieldError className="w-full">{t(`errors.${error}`)}</FieldError>}
    </Item>
  );
}

export function BookingCalendar({
  bookings,
  day,
  clock,
}: {
  bookings: CraftsmanBooking[];
  day: string;
  clock: ViewerClock;
}) {
  const t = useTranslations("dashboard.bookings");
  const cityName = useTranslations("cities");
  const locale = useLocale();
  const { changing, selectJobDay } = useScheduleParams();
  const { calendar, emptyMessage, cards } = useBookingCalendar({
    bookings,
    day,
    clock,
    locale: formattingLocale(locale),
    text: {
      cityName,
      status: (status) => t(`status.${status}`),
      action: (transition) => t(`actions.${transition}`),
      actionPending: (transition) => t(`actions.${transition}Pending`),
      price: (parts) => t("price", parts),
      empty: t("noBookings"),
    },
  });

  return (
    // The calendar leads on a phone and sits beside the jobs from large screens on.
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row-reverse lg:items-start">
      <div className="w-full min-w-0 overflow-hidden rounded-xl border lg:max-w-80">
        <ScheduleCalendar calendar={calendar} allowPast onSelect={selectJobDay} />
      </div>
      {/* The calendar stays live so the latest click wins; the list fades only on a slow answer. */}
      <div
        aria-busy={changing}
        data-changing={changing || undefined}
        className="flex min-w-0 flex-1 flex-col gap-3 transition-opacity data-changing:opacity-60 data-changing:delay-300"
      >
        {emptyMessage ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ItemGroup>
            {cards.map((card) => (
              <BookingCard key={card.id} {...card} />
            ))}
          </ItemGroup>
        )}
      </div>
    </div>
  );
}
