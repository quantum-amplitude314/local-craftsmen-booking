"use client";

import type { BookingAction, OwnBooking } from "@local-craftsmen/contracts";
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

type BookingStep = { card: BookingCardModel; action: BookingAction; shownDay: string };

/** Keeps the card while the dialog animates closed. */
type CancelDialogState = { card: BookingCardModel; open: boolean };

function BookingCard({
  card,
  busy,
  pendingAction,
  onCancel,
  onAdvance,
}: {
  card: BookingCardModel;
  busy: boolean;
  pendingAction: BookingAction | null;
  onCancel: () => void;
  onAdvance: (action: BookingAction) => void;
}) {
  const t = useTranslations("dashboard.bookings");
  const {
    timeLabel,
    partyName,
    placeLabel,
    priceLabel,
    statusLabel,
    statusVariant,
    cancellable,
    actions,
  } = card;

  return (
    <Item role="listitem" size="sm" className="border-primary/20 bg-primary/10">
      <ItemHeader>
        <ItemTitle className="text-base tabular-nums">{timeLabel}</ItemTitle>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </ItemHeader>
      <ItemContent className="min-w-0 gap-0.5">
        <p className="font-medium wrap-break-word">{partyName}</p>
        <ItemDescription className="line-clamp-none">{placeLabel}</ItemDescription>
        <ItemDescription className="line-clamp-none tabular-nums">{priceLabel}</ItemDescription>
      </ItemContent>
      {(cancellable || actions.length > 0) && (
        <ItemFooter className="justify-end">
          <ItemActions>
            {cancellable && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={onCancel}
              >
                {t("cancelDialog.open")}
              </Button>
            )}
            {actions.map(({ action, label, pendingLabel }) => (
              <PendingButton
                key={action}
                size="sm"
                pending={pendingAction === action}
                disabled={busy}
                label={label}
                pendingLabel={pendingLabel}
                onClick={() => onAdvance(action)}
              />
            ))}
          </ItemActions>
        </ItemFooter>
      )}
    </Item>
  );
}

function CancelBookingDialog({
  dialog,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  dialog: CancelDialogState | null;
  pending: boolean;
  error: BookingActionState["error"];
  onConfirm: (card: BookingCardModel) => void;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.bookings");

  return (
    <Dialog
      open={dialog?.open ?? false}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      {dialog && (
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("cancelDialog.description", {
                party: dialog.card.partyName,
                time: dialog.card.timeLabel,
              })}
            </DialogDescription>
          </DialogHeader>
          {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>
              {t("cancelDialog.keep")}
            </DialogClose>
            <PendingButton
              variant="destructive"
              pending={pending}
              label={t("cancelDialog.confirm")}
              pendingLabel={t("actions.cancelPending")}
              onClick={() => onConfirm(dialog.card)}
            />
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

export function BookingCalendar({
  bookings,
  day,
  clock,
}: {
  bookings: OwnBooking[];
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
      action: (action) => t(`actions.${action}`),
      actionPending: (action) => t(`actions.${action}Pending`),
      price: (parts) => t("price", parts),
      empty: t("noBookings"),
    },
  });
  const [step, setStep] = useState<BookingStep | null>(null);
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState | null>(null);
  const closeCancelDialog = () =>
    setCancelDialog((current) => current && { ...current, open: false });
  const { state, pending, run, clear } = useMutation({
    action: advanceBooking,
    initialState,
    failureState: { error: "advanceFailed" },
    onResult: ({ error }) => {
      if (!error) closeCancelDialog();
    },
  });
  const { error } = state;
  const advance = ({ card, action }: { card: BookingCardModel; action: BookingAction }) => {
    setStep({ card, action, shownDay: day });
    run({ id: card.id, action });
  };
  const openCancelDialog = (card: BookingCardModel) => {
    clear();
    setCancelDialog({ card, open: true });
  };
  const cancelling = step?.action === "cancel";
  const stepFailure =
    error && step && !cancelling && step.shownDay === day
      ? t("stepFailed", {
          party: step.card.partyName,
          time: step.card.timeLabel,
          message: t(`errors.${error}`),
        })
      : null;

  return (
    <div className="@container min-w-0">
      <div className="flex flex-col gap-6 @split:flex-row-reverse @split:items-start">
        <div className="w-full min-w-0 overflow-hidden rounded-xl border @split:max-w-70">
          <ScheduleCalendar calendar={calendar} allowPast onSelect={selectJobDay} />
        </div>

        <div
          aria-busy={changing}
          data-changing={changing || undefined}
          className="flex min-w-0 flex-1 flex-col gap-3 transition-opacity data-changing:opacity-60 data-changing:delay-300"
        >
          {stepFailure && <FieldError>{stepFailure}</FieldError>}
          {emptyMessage ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <ItemGroup>
              {cards.map((card) => {
                const { id } = card;
                const stepped = step?.card.id === id;

                return (
                  <BookingCard
                    key={id}
                    card={card}
                    busy={pending}
                    pendingAction={pending && stepped ? step.action : null}
                    onCancel={() => openCancelDialog(card)}
                    onAdvance={(action) => advance({ card, action })}
                  />
                );
              })}
            </ItemGroup>
          )}
        </div>
      </div>
      <CancelBookingDialog
        dialog={cancelDialog}
        pending={pending && cancelling}
        error={cancelling ? error : undefined}
        onConfirm={(card) => advance({ card, action: "cancel" })}
        onClose={closeCancelDialog}
      />
    </div>
  );
}
