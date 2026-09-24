"use client";

import type { BookingInput } from "@local-craftsmen/contracts";
import { BOOKING_MIN_MINUTES, currencySchema } from "@local-craftsmen/contracts";
import { useState } from "react";
import type { DurationChoice, SlotBookingModel } from "@/lib/slot-listing-model";

const MINUTE_MS = 60_000;

/**
 * One customer's choice within a slot: when to start, how long, where exactly, and in which
 * currency. Choosing a late start shortens what is left, so the length follows the start rather
 * than fighting it.
 */
export const useBookSlot = ({ model }: { model: SlotBookingModel }) => {
  const { slotId, cityId, starts, durations, areas, currencies } = model;
  const [startValue, setStart] = useState(starts[0]?.value ?? "");
  const [wantedMinutes, setMinutes] = useState(BOOKING_MIN_MINUTES);
  const [areaValue, setArea] = useState(areas[0]?.value ?? "");
  const [currencyValue, setCurrency] = useState(currencies[0]?.value ?? "");

  const start = starts.find(({ value }) => value === startValue) ?? starts[0];
  const room = start?.maxMinutes ?? BOOKING_MIN_MINUTES;
  const offered: DurationChoice[] = durations.filter(({ minutes }) => minutes <= room);
  const minutes = Math.min(wantedMinutes, room);
  const chosen = offered.find((duration) => duration.minutes === minutes) ?? offered[0];
  const currency = currencySchema.safeParse(currencyValue);
  const input: BookingInput | null =
    start && chosen && currency.success
      ? {
          slotId,
          start: start.value,
          end: new Date(Date.parse(start.value) + chosen.minutes * MINUTE_MS).toISOString(),
          location: { cityId, districtId: areaValue || null },
          currency: currency.data,
        }
      : null;
  const draft = {
    startValue: start?.value ?? "",
    minutes: chosen?.minutes ?? BOOKING_MIN_MINUTES,
    areaValue,
    currencyValue,
    durations: offered,
    priceLabel: chosen?.priceLabels[currencyValue] ?? "",
    input,
    setStart,
    setMinutes: (value: string) => setMinutes(Number(value)),
    setArea,
    setCurrency,
  };

  return draft;
};
