"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { type BookSlotState, bookSlot } from "@/app/book-actions";
import { PendingButton } from "@/components/pending-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SlotBookingModel } from "@/lib/slot-listing-model";
import { useBookSlot } from "@/lib/use-book-slot";
import { useMutation } from "@/lib/use-mutation";

const initialState: BookSlotState = {};

function BookSlotForm({
  model,
  heading,
  onBooked,
}: {
  model: SlotBookingModel;
  heading: string;
  onBooked: () => void;
}) {
  const t = useTranslations("directory.book");
  const {
    startValue,
    minutes,
    areaValue,
    currencyValue,
    durations,
    priceLabel,
    input,
    setStart,
    setMinutes,
    setArea,
    setCurrency,
  } = useBookSlot({ model });
  const { state, pending, run } = useMutation({
    action: bookSlot,
    initialState,
    failureState: { error: "failed" },
    onResult: ({ booked }) => {
      if (booked) onBooked();
    },
  });
  const { error } = state;
  const { starts, areas, currencies } = model;
  const field = (id: string) => `book-${model.slotId}-${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={field("start")}>{t("start")}</FieldLabel>
          <Select
            items={starts}
            value={startValue || null}
            disabled={pending}
            onValueChange={(value: string | null) => {
              if (value) setStart(value);
            }}
          >
            <SelectTrigger id={field("start")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {starts.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={field("length")}>{t("length")}</FieldLabel>
          <Select
            items={durations.map(({ minutes: value, label }) => ({ value: String(value), label }))}
            value={String(minutes)}
            disabled={pending}
            onValueChange={(value: string | null) => {
              if (value) setMinutes(value);
            }}
          >
            <SelectTrigger id={field("length")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {durations.map(({ minutes: value, label }) => (
                  <SelectItem key={value} value={String(value)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {areas.length > 1 && (
          <Field>
            <FieldLabel htmlFor={field("area")}>{t("where")}</FieldLabel>
            <Select
              items={areas}
              value={areaValue}
              disabled={pending}
              onValueChange={(value: string | null) => setArea(value ?? "")}
            >
              <SelectTrigger id={field("area")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {areas.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}

        {currencies.length > 1 && (
          <Field>
            <FieldLabel htmlFor={field("currency")}>{t("currency")}</FieldLabel>
            <Select
              items={currencies}
              value={currencyValue || null}
              disabled={pending}
              onValueChange={(value: string | null) => {
                if (value) setCurrency(value);
              }}
            >
              <SelectTrigger id={field("currency")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {currencies.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="text-sm text-muted-foreground">
          {t("total")} <span className="font-medium text-foreground">{priceLabel}</span>
        </p>
        <PendingButton
          size="lg"
          pending={pending}
          disabled={!input}
          label={heading}
          pendingLabel={t("booking")}
          onClick={() => {
            if (input) run(input);
          }}
        />
      </div>
      {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
    </div>
  );
}

export function BookSlotButton({
  booking,
  craftsmanName,
  whenLabel,
}: {
  booking: SlotBookingModel;
  craftsmanName: string;
  whenLabel: string;
}) {
  const t = useTranslations("directory.book");
  const [open, setOpen] = useState(false);
  const heading = t("action");

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {heading}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-8 sm:max-w-xl sm:p-10">
          <DialogHeader>
            <DialogTitle>{craftsmanName}</DialogTitle>
            <DialogDescription>{whenLabel}</DialogDescription>
          </DialogHeader>
          <BookSlotForm model={booking} heading={heading} onBooked={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
