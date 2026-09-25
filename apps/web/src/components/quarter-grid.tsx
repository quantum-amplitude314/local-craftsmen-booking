"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { QuarterOption } from "@/lib/use-slot-draft";

// No transitions or press shift: up to a hundred quarters repaint on every click and must stay still.
const quarterClassName = ({ state, selected, edge }: QuarterOption) =>
  cn(
    "tabular-nums transition-none active:not-aria-[haspopup]:translate-y-0",
    edge && "hover:bg-primary",
    selected &&
      !edge &&
      "border-primary/40 bg-primary/15 hover:bg-primary/25 dark:bg-primary/15 dark:hover:bg-primary/25",
    state === "break" && "border-dashed",
  );

function QuarterButton({
  option,
  onPick,
}: {
  option: QuarterOption;
  onPick: (time: string) => void;
}) {
  const t = useTranslations("dashboard.availability");
  const { start, label, state, selected, edge } = option;
  const free = state === "free";
  const stateLabel = state === "break" || state === "occupied" ? t(`states.${state}`) : undefined;

  return (
    <Button
      type="button"
      variant={edge ? "default" : "outline"}
      size="lg"
      disabled={!free}
      aria-pressed={selected}
      title={stateLabel}
      data-bookable={free || undefined}
      className={quarterClassName(option)}
      onClick={() => onPick(start)}
    >
      <time dateTime={start}>{label}</time>
      {stateLabel && <span className="sr-only">{stateLabel}</span>}
    </Button>
  );
}

/**
 * The quarters as buttons in rows; the caller sets how many make a row. Mounted once per day or
 * slot (keyed by the caller), so it scrolls to the first bookable quarter only then.
 */
export function QuarterGrid({
  options,
  pending,
  className,
  onPick,
}: {
  options: QuarterOption[];
  pending: boolean;
  className: string;
  onPick: (time: string) => void;
}) {
  const t = useTranslations("dashboard.availability");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { current: grid } = gridRef;
    const first = grid?.querySelector<HTMLElement>("[data-bookable]");
    if (grid && first)
      grid.scrollTo({ top: Math.max(0, first.offsetTop - 4), behavior: "instant" });
  }, []);

  return (
    <fieldset disabled={pending} className="min-w-0">
      <legend className="sr-only">{t("times")}</legend>
      <div
        ref={gridRef}
        className={cn(
          "relative grid max-h-80 gap-2 overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable]",
          className,
        )}
      >
        {options.map((option) => (
          <QuarterButton key={option.start} option={option} onPick={onPick} />
        ))}
      </div>
    </fieldset>
  );
}
