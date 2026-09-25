"use client";

import { BOOKING_MIN_MINUTES, SLOT_MAX_MINUTES } from "@local-craftsmen/contracts";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { useMutation } from "@/lib/use-mutation";
import { useOfferBooking } from "@/lib/use-offer-booking";
import { useScheduleParams } from "@/lib/use-schedule-params";

const initialState: BookSlotState = {};

function BookingDialogBody({
  booking,
  onBooked,
}: {
  booking: OfferBookingModel;
  onBooked: () => void;
}) {
  const t = useTranslations("dashboard");
  const { slotId, date, craftsmanName, windowLabel, places, placeFixed } = booking;
  const { options, status, place, rangeLabel, priceLabel, input, setPlace, pick } = useOfferBooking(
    { booking },
  );
  const { selectJobDay } = useScheduleParams();
  const { state, pending, run } = useMutation({
    action: bookSlot,
    initialState,
    failureState: { error: "failed" },
    onResult: ({ booked }) => {
      if (!booked) return;
      onBooked();
      // The new booking shows at once in the bookings calendar beside the offer.
      selectJobDay(date);
    },
  });
  const { error } = state;
  const issues = {
    pickRange: null,
    tooShort: t("availability.tooShort", { hours: BOOKING_MIN_MINUTES / 60 }),
    tooLong: t("availability.tooLong", { hours: SLOT_MAX_MINUTES / 60 }),
    ready: null,
  };
  const issue = error ? t(`slots.errors.${error}`) : issues[status];
  const placeField = `book-${slotId}-place`;

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
  // One line under the range holds the price or what stands in its way, so the dialog never
  // changes height while quarters are picked.
  const summary = (
    <div aria-live="polite" className="flex min-w-0 flex-col gap-1">
      <p className="min-h-8 text-2xl font-semibold text-primary tabular-nums">{rangeLabel}</p>
      {issue ? (
        <p className="min-h-5 text-sm text-destructive">{issue}</p>
      ) : (
        <p className="min-h-5 text-sm text-muted-foreground tabular-nums">{priceLabel}</p>
      )}
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

export function SlotBookingButton({ booking }: { booking: OfferBookingModel }) {
  const t = useTranslations("dashboard.slots");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {t("book")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Mounted only while open, so every opening starts from the slot's first hour. */}
        {open && <BookingDialogBody booking={booking} onBooked={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}
