"use client";

import type { Option } from "@/components/option-combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A select above a calendar that decides what the calendar and its list show. */
export function FilterSelect({
  id,
  anyLabel,
  options,
  value,
  disabled = false,
  onValueChange,
}: {
  id: string;
  /** Offers "any" as the first choice; without it a value is required. */
  anyLabel?: string;
  options: Option[];
  value: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const items = [...(anyLabel ? [{ value: null, label: anyLabel }] : []), ...options];

  return (
    <Select
      items={items}
      value={value || null}
      disabled={disabled}
      onValueChange={(next: string | null) => onValueChange(next ?? "")}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map(({ value: itemValue, label }) => (
            <SelectItem key={itemValue ?? "any"} value={itemValue}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
