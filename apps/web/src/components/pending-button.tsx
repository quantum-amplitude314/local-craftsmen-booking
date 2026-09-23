"use client";

import { cn } from "cn";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

export function PendingButton({
  pending,
  label,
  pendingLabel,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <Button
      type="button"
      disabled={pending || disabled}
      aria-label={pending ? pendingLabel : label}
      {...props}
    >
      <span aria-hidden="true" className="grid">
        <span
          className={cn(
            "col-start-1 row-start-1 transition-opacity duration-150",
            pending && "opacity-0 delay-150",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 opacity-0 transition-opacity duration-150",
            pending && "opacity-100 delay-150",
          )}
        >
          {pendingLabel}
        </span>
      </span>
    </Button>
  );
}
