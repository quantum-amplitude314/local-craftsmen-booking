"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { matchesWordStart } from "@/lib/option-filter";

export type Option = { value: string; label: string };

const isSameOption = (option: Option, selected: Option) => option.value === selected.value;

const optionFilter = (selected: Option | null) => (option: Option, query: string) =>
  query === selected?.label || matchesWordStart({ label: option.label, query });

/** A searchable single choice that reports the chosen value, or "" when cleared. */
export function OptionCombobox({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  disabled = false,
  clearable = false,
  invalid = false,
  describedBy,
}: {
  id: string;
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  emptyLabel: string;
  disabled?: boolean;
  clearable?: boolean;
  invalid?: boolean;
  describedBy?: string | undefined;
}) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      disabled={disabled}
      filter={optionFilter(selected)}
      isItemEqualToValue={isSameOption}
      itemToStringLabel={({ label }: Option) => label}
      onValueChange={(option: Option | null) => onValueChange(option?.value ?? "")}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder={placeholder}
        showClear={clearable && !!selected}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(option: Option) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
