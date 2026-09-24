"use client";

import { cityIdSchema } from "@local-craftsmen/contracts";
import { startTransition, useOptimistic, useState } from "react";
import { createSlot, type SlotFormState } from "@/app/availability-actions";
import type { AvailabilityModel, QuarterModel } from "@/lib/availability-model";
import {
  draftStatus,
  pickQuarter,
  type QuarterSelection,
  selectedRange,
} from "@/lib/slot-selection";
import { useMutation } from "@/lib/use-mutation";
import { useScheduleParams } from "@/lib/use-schedule-params";

const initialState: SlotFormState = {};

export type QuarterOption = QuarterModel & {
  selected: boolean;
  /** The first or last selected quarter. */
  edge: boolean;
};

/**
 * Owns what the craftsman is currently doing: the quarters picked, the coverage chosen and the
 * save in flight. Every label it hands back was prepared on the server.
 */
export const useSlotDraft = ({ availability }: { availability: AvailabilityModel }) => {
  const { quarters: dayQuarters, nextDayQuarters, draftArea, hints, errors } = availability;
  const { changing, selectDay, selectCity } = useScheduleParams();
  // The picked city shows at once and stays until the server answers in its zone, so the field
  // never falls back to the city being left behind.
  const [cityId, showCity] = useOptimistic(draftArea.cityId);
  const [selection, setSelection] = useState<QuarterSelection>(null);
  const [district, setDistrict] = useState(draftArea);
  const { state, pending, run, clear } = useMutation({
    action: createSlot,
    initialState,
    failureState: { error: "saveFailed" },
  });

  // A city also arrives as new props on back and forward, carrying the district it preselects.
  if (district.cityId !== draftArea.cityId) {
    setDistrict(draftArea);
    setSelection(null);
  }
  // Until the schedule confirms the picked city, no district of it has been chosen.
  const districtId = district.cityId === cityId ? district.districtId : "";

  const lastDayQuarter = dayQuarters.at(-1)?.start ?? "";
  const quarters =
    selection && selection.last >= lastDayQuarter
      ? [...dayQuarters, ...nextDayQuarters]
      : dayQuarters;
  const range = selectedRange({ selection, quarters });
  const current = range ? selection : null;
  const status = draftStatus({ range });
  const { error, saved } = state;
  const firstQuarter = quarters.find(({ start }) => start === current?.first);
  const lastQuarter = quarters.find(({ start }) => start === current?.last);
  const options: QuarterOption[] = quarters.map((quarter) => ({
    ...quarter,
    selected: !!range?.quarters.has(quarter.start),
    edge: quarter.start === current?.first || quarter.start === current?.last,
  }));

  const changeDay = (date: string) => {
    setSelection(null);
    clear();
    selectDay(date);
  };

  const pick = (time: string) => {
    setSelection(pickQuarter({ selection: current, time, quarters }));
    clear();
  };
  const changeCity = (value: string) =>
    startTransition(() => {
      showCity(value);
      setSelection(null);
      clear();
      selectCity(value);
    });
  const changeDistrict = (value: string) => {
    setDistrict({ cityId, districtId: value });
    clear();
  };
  const ready = status === "ready" && !pending && !changing;
  const save = () => {
    const city = cityIdSchema.safeParse(cityId);
    if (!ready || !range || !city.success) return;
    const { start, end } = range;
    run({ start, end, areas: [{ cityId: city.data, districtId: districtId || null }] });
  };

  const draft = {
    options,
    cityId,
    districtId,
    pending,
    changing,
    canSave: ready,
    rangeLabel:
      firstQuarter && lastQuarter ? `${firstQuarter.label} – ${lastQuarter.endLabel}` : null,
    hint: error || saved || status === "ready" ? null : hints[status],
    errorMessage: error ? errors[error] : null,
    savedMessage: !pending && saved ? availability.savedMessage : null,
    changeDay,
    pick,
    changeCity,
    changeDistrict,
    save,
  };

  return draft;
};
