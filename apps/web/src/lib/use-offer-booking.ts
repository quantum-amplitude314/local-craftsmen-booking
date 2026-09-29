"use client";

import { type BookingInput, durationMinutes } from "@local-craftsmen/contracts";
import { useState } from "react";
import type { OfferBookingModel } from "@/lib/slot-offer-model";
import { draftStatus, firstFreeHour, pickQuarter, selectedRange } from "@/lib/slot-selection";
import type { QuarterOption } from "@/lib/use-slot-draft";

/**
 * One customer's choice within a slot: the quarters picked, the same way the planner picks them,
 * and where the work is. Quarters already started are past; the rest are free, so any picked range
 * can be booked once it is long enough.
 */
export const useOfferBooking = ({ booking }: { booking: OfferBookingModel }) => {
  const { slotId, cityId, currency, quarters, defaultPlace, priceLabels } = booking;
  const [selection, setSelection] = useState(() => firstFreeHour({ quarters }));
  const [place, setPlace] = useState(defaultPlace);
  const range = selectedRange({ selection, quarters });
  const current = range ? selection : null;
  const status = draftStatus({ range });
  const firstQuarter = quarters.find(({ start }) => start === current?.first);
  const lastQuarter = quarters.find(({ start }) => start === current?.last);
  const options: QuarterOption[] = quarters.map((quarter) => ({
    ...quarter,
    selected: !!range?.quarters.has(quarter.start),
    edge: quarter.start === current?.first || quarter.start === current?.last,
  }));
  const input: BookingInput | null =
    range && status === "ready"
      ? {
          slotId,
          start: range.start,
          end: range.end,
          location: { cityId, districtId: place || null },
          currency,
        }
      : null;
  const draft = {
    options,
    status,
    place,
    rangeLabel:
      firstQuarter && lastQuarter ? `${firstQuarter.label} – ${lastQuarter.endLabel}` : "",
    priceLabel: range ? (priceLabels[durationMinutes(range)] ?? "") : "",
    input,
    setPlace,
    pick: (time: string) => setSelection(pickQuarter({ selection: current, time, quarters })),
  };

  return draft;
};
