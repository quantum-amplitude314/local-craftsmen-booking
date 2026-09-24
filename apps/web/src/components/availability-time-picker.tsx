"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { QuarterOption } from "@/lib/use-slot-draft";

// No transitions or press shift: about a hundred quarters repaint on every click and must stay still.
const quarterClassName = ({ state, selected, edge }: QuarterOption) =>
  cn(
    "relative tabular-nums transition-none active:not-aria-[haspopup]:translate-y-0",
    edge && "hover:bg-primary",
    selected &&
      !edge &&
      "cursor-default border-primary/40 bg-primary/15 hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/15",
    state === "break" && "border-dashed",
  );

function QuarterContent({ option }: { option: QuarterOption }) {
  const t = useTranslations("dashboard.availability");
  const { start, label, endLabel, state } = option;

  return (
    <>
      <time dateTime={start}>{label}</time>
      {endLabel && <span className="font-normal opacity-60">– {endLabel}</span>}
      {(state === "break" || state === "occupied") && (
        <span className="absolute right-3 text-xs font-normal">{t(`states.${state}`)}</span>
      )}
    </>
  );
}

function QuarterButton({
  option,
  onPick,
}: {
  option: QuarterOption;
  onPick: (time: string) => void;
}) {
  const { start, state, selected, edge } = option;
  const free = state === "free";

  return (
    <Button
      type="button"
      variant={edge ? "default" : "outline"}
      size="lg"
      disabled={!free}
      aria-pressed={selected}
      data-bookable={free || undefined}
      className={quarterClassName(option)}
      onClick={() => onPick(start)}
    >
      <QuarterContent option={option} />
    </Button>
  );
}

/** Mounted once per day (keyed by the caller), so it scrolls to the first bookable quarter only then. */
function QuarterList({
  options,
  onPick,
}: {
  options: QuarterOption[];
  onPick: (time: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { current: list } = listRef;
    const first = list?.querySelector<HTMLElement>("[data-bookable]");
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
      className="absolute inset-0 grid grid-cols-1 content-start gap-2 overflow-y-auto overscroll-contain scroll-smooth p-1 [scrollbar-gutter:stable] motion-reduce:scroll-auto"
    >
      {options.map((option) => (
        <QuarterButton key={option.start} option={option} onPick={onPick} />
      ))}
    </div>
  );
}

export function AvailabilityTimePicker({
  date,
  options,
  pending,
  onPick,
}: {
  date: string;
  options: QuarterOption[];
  pending: boolean;
  onPick: (time: string) => void;
}) {
  const t = useTranslations("dashboard.availability");

  return (
    <fieldset className="flex min-w-0 flex-col gap-3" disabled={pending}>
      <legend className="sr-only">{t("times")}</legend>
      {/* The list fills the column beside the calendar without adding height of its own. */}
      <div className="relative min-h-80 flex-1">
        <QuarterList key={date} options={options} onPick={onPick} />
      </div>
    </fieldset>
  );
}
