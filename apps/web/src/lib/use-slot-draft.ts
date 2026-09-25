"use client";

import { cityIdSchema } from "@local-craftsmen/contracts";
import { useState } from "react";
import { createSlot, type SlotFormState } from "@/app/availability-actions";
import type { AvailabilityModel, QuarterModel } from "@/lib/availability-model";
import {
  draftStatus,
  pickQuarter,
  type QuarterSelection,
  selectedRange,
} from "@/lib/slot-selection";
import { useMutation } from "@/lib/use-mutation";

const initialState: SlotFormState = {};

export type QuarterOption = QuarterModel & {
  selected: boolean;
  /** The first or last selected quarter. */
  edge: boolean;
};

/**
 * Owns what the craftsman is currently doing: the quarters picked, the district chosen and the
 * save in flight. The day and city come from the dashboard, so the dialog is mounted per opening
 * and every label it hands back was prepared on the server.
 */
export const useSlotDraft = ({ availability }: { availability: AvailabilityModel }) => {
  const { quarters: dayQuarters, nextDayQuarters, draftArea, hints, errors } = availability;
  const { cityId } = draftArea;
  const [selection, setSelection] = useState<QuarterSelection>(null);
  const [districtId, setDistrictId] = useState(draftArea.districtId);
  const { state, pending, run, clear } = useMutation({
    action: createSlot,
    initialState,
    failureState: { error: "saveFailed" },
  });

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

  const pick = (time: string) => {
    setSelection(pickQuarter({ selection: current, time, quarters }));
    clear();
  };
  const changeDistrict = (value: string) => {
    setDistrictId(value);
    clear();
  };
  const ready = status === "ready" && !pending;
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
    canSave: ready,
    rangeLabel:
      firstQuarter && lastQuarter ? `${firstQuarter.label} – ${lastQuarter.endLabel}` : null,
    hint: error || saved || status === "ready" ? null : hints[status],
    errorMessage: error ? errors[error] : null,
    savedMessage: !pending && saved ? availability.savedMessage : null,
    pick,
    changeDistrict,
    save,
  };

  return draft;
};
