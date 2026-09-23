"use client";

import type { SlotTime } from "@local-craftsmen/contracts";
import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export type TimeOption = {
  time: string;
  label: string;
  state: SlotTime["state"];
  enabled: boolean;
  selected: boolean;
  inRange: boolean;
};

const optionVariant = ({ selected, inRange }: Pick<TimeOption, "selected" | "inRange">) => {
  if (selected) return "default";
  const variant = inRange ? "secondary" : "outline";

  return variant;
};

function TimeOptionButton({
  option,
  pending,
  onPick,
}: {
  option: TimeOption;
  pending: boolean;
  onPick: (time: string) => void;
}) {
  const t = useTranslations("dashboard.availability");
  const { time, label, state, enabled, selected } = option;

  return (
    <Button
      type="button"
      variant={optionVariant(option)}
      size="lg"
      disabled={!enabled || pending}
      aria-pressed={selected}
      data-bookable={enabled}
      className={cn("tabular-nums", state === "break" && "border-dashed")}
      onClick={() => onPick(time)}
    >
      <time dateTime={time}>{label}</time>
      {state !== "free" && <span className="sr-only">, {t(`states.${state}`)}</span>}
    </Button>
  );
}

/** Mounted once per day (keyed by the caller), so it scrolls to the first bookable time only then. */
function TimeOptions({
  options,
  pending,
  onPick,
}: {
  options: TimeOption[];
  pending: boolean;
  onPick: (time: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { current: list } = listRef;
    const first = list?.querySelector<HTMLElement>('[data-bookable="true"]');
    if (!list) return;
    if (first) list.scrollTo({ top: Math.max(0, first.offsetTop - 8), behavior: "instant" });
    const scroll = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
        return;
      if (list.scrollHeight <= list.clientHeight) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientHeight : 1;
      const distance = event.deltaY * unit * 0.6;
      list.scrollBy({
        top: Math.sign(distance) * Math.min(Math.abs(distance), 80),
        behavior: "instant",
      });
    };
    list.addEventListener("wheel", scroll, { passive: false });

    return () => list.removeEventListener("wheel", scroll);
  }, []);

  return (
    <div
      ref={listRef}
      className="relative grid h-80 grid-cols-1 content-start gap-2 overflow-y-auto overscroll-contain scroll-smooth p-1 [scrollbar-gutter:stable] motion-reduce:scroll-auto"
    >
      {options.map((option) => (
        <TimeOptionButton key={option.time} option={option} pending={pending} onPick={onPick} />
      ))}
    </div>
  );
}

export function AvailabilityTimePicker({
  date,
  options,
  startLabel,
  choosingEnd,
  pending,
  onPick,
  onReset,
}: {
  date: string;
  options: TimeOption[];
  startLabel: string | null;
  choosingEnd: boolean;
  pending: boolean;
  onPick: (time: string) => void;
  onReset: () => void;
}) {
  const t = useTranslations("dashboard.availability");

  return (
    <fieldset className="flex min-w-0 flex-col gap-4" disabled={pending}>
      <legend className="mb-3 text-sm font-medium">
        {t(choosingEnd ? "endTime" : "startTime")}
      </legend>
      <div className="flex min-h-10 items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {startLabel === null ? t("pickStart") : t("startsAt", { time: startLabel })}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!choosingEnd || pending}
          onClick={onReset}
        >
          {t("reset")}
        </Button>
      </div>
      <TimeOptions key={date} options={options} pending={pending} onPick={onPick} />
      <p className="min-h-10 text-xs text-muted-foreground">
        {t(choosingEnd ? "pickEnd" : "timeHint")}
      </p>
    </fieldset>
  );
}
