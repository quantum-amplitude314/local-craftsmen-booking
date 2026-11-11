"use client";

import {
  BOOKING_MIN_MINUTES,
  type BookingOffer,
  SLOT_MAX_MINUTES,
} from "@local-craftsmen/contracts";
import { useTranslations } from "next-intl";
import { type BookSlotState, bookSlot } from "@/app/book-actions";
import { PendingButton } from "@/components/pending-button";
import { QuarterGrid } from "@/components/quarter-grid";
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
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OfferBookingModel } from "@/lib/slot-offer-model";
import { viewerDayOf } from "@/lib/use-booking-calendar";
import { useMutation } from "@/lib/use-mutation";
import { useOfferBooking } from "@/lib/use-offer-booking";
import { useScheduleParams } from "@/lib/use-schedule-params";

const initialState: BookSlotState = {};

function BookingDialogBody({
  booking,
  onBooked,
  onOfferChanged,
}: {
  booking: OfferBookingModel;
  onBooked: () => void;
  onOfferChanged: (offer: BookingOffer) => void;
}) {
  const t = useTranslations("dashboard");
  const tCrafts = useTranslations("crafts");
  const { slotId, craftsmanName, windowLabel, places, placeFixed, craft, rateLabel } = booking;
  const { options, status, place, rangeLabel, priceLabel, input, setPlace, pick } = useOfferBooking(
    { booking },
  );
  const { selectJobDay } = useScheduleParams();
  const { state, pending, run } = useMutation({
    action: bookSlot,
    initialState,
    failureState: { error: "failed" },
    onResult: ({ bookedStart, offerChange }) => {
      if (offerChange) onOfferChanged(offerChange.current);
      if (!bookedStart) return;
      onBooked();
      // Jobs file under the viewer's day, which can differ from the slot's date.
      selectJobDay(viewerDayOf(bookedStart));
    },
  });
  const { error, offerChange } = state;
  const issues = {
    pickRange: null,
    tooShort: t("availability.tooShort", { hours: BOOKING_MIN_MINUTES / 60 }),
    tooLong: t("availability.tooLong", { hours: SLOT_MAX_MINUTES / 60 }),
    ready: null,
  };
  const issue = error ? t(`slots.errors.${error}`) : issues[status];
  const placeField = `book-${slotId}-place`;
  const offerNote = offerChange
    ? [
        offerChange.craftChanged &&
          t("slots.offerChanged.craft", { name: craftsmanName, craft: tCrafts(craft) }),
        offerChange.rateChanged && t("slots.offerChanged.rate", { rate: rateLabel }),
        t("slots.offerChanged.bookAgain"),
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  const header = (
    <DialogHeader>
      <DialogTitle>{craftsmanName}</DialogTitle>
      <DialogDescription>{windowLabel}</DialogDescription>
    </DialogHeader>
  );
  const instruction = (
    <p className="text-sm text-muted-foreground">{t("availability.pickRange")}</p>
  );
  const placeSelect = (
    <Field data-disabled={placeFixed || undefined}>
      <FieldLabel htmlFor={placeField}>{t("slots.place")}</FieldLabel>
      <Select
        items={places}
        value={place}
        disabled={placeFixed || pending}
        onValueChange={(value: string | null) => setPlace(value ?? "")}
      >
        <SelectTrigger id={placeField} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {places.map(({ value, label }) => (
              <SelectItem key={value || "whole-city"} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
  // Price and issue share one line, so picking quarters keeps the dialog's height.
  const summary = (
    <div aria-live="polite" className="flex min-w-0 flex-col gap-1">
      <p className="min-h-8 text-2xl font-semibold text-primary tabular-nums">{rangeLabel}</p>
      {issue ? (
        <p className="min-h-5 text-sm text-destructive">{issue}</p>
      ) : (
        <p className="min-h-5 text-sm text-muted-foreground tabular-nums">{priceLabel}</p>
      )}
      {offerNote && <p className="text-sm text-destructive">{offerNote}</p>}
    </div>
  );
  const footer = (
    <DialogFooter>
      <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>
        {t("slots.close")}
      </DialogClose>
      <PendingButton
        pending={pending}
        disabled={!input}
        label={t("slots.book")}
        pendingLabel={t("slots.booking")}
        onClick={() => {
          if (input) run(input);
        }}
      />
    </DialogFooter>
  );

  return (
    <DialogContent className="sm:max-w-md">
      {header}
      {instruction}
      <QuarterGrid options={options} pending={pending} className="grid-cols-4" onPick={pick} />
      {placeSelect}
      {summary}
      {footer}
    </DialogContent>
  );
}

export function SlotBookingDialog({
  booking,
  onClose,
  onOfferChanged,
}: {
  booking: OfferBookingModel | null;
  onClose: () => void;
  onOfferChanged: (offer: BookingOffer) => void;
}) {
  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Mounted only while open, so each opening starts from the slot's first hour. */}
      {booking && (
        <BookingDialogBody booking={booking} onBooked={onClose} onOfferChanged={onOfferChanged} />
      )}
    </Dialog>
  );
}
