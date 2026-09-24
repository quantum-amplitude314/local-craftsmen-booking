"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Option } from "@/components/option-combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SlotFilters } from "@/lib/slot-filters";
import { hasSlotFilters } from "@/lib/slot-filters";
import { useSlotFilters } from "@/lib/use-slot-filters";

export type SlotFilterOptions = {
  crafts: Option[];
  cities: Option[];
  districtsByCity: Record<string, Option[]>;
};

function FilterSelect({
  id,
  label,
  anyLabel,
  options,
  value,
  disabled,
  onValueChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  options: Option[];
  value: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
}) {
  const items = [{ value: null, label: anyLabel }, ...options];

  return (
    <Field data-disabled={disabled || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
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
            {items.map(({ value: itemValue, label: itemLabel }) => (
              <SelectItem key={itemValue ?? "any"} value={itemValue}>
                {itemLabel}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function SlotFilterBar({
  filters,
  options,
  minDate,
}: {
  filters: SlotFilters;
  options: SlotFilterOptions;
  minDate: string;
}) {
  const t = useTranslations("directory.filters");
  const { changing, setCraft, setCity, setDistrict, setDate, clear } = useSlotFilters({ filters });
  const { craft, cityId, districtId, date } = filters;
  const { crafts, cities, districtsByCity } = options;
  const districts = districtsByCity[cityId] ?? [];
  const anyLabel = t("any");

  return (
    <section
      aria-label={t("legend")}
      data-changing={changing || undefined}
      className="grid gap-4 border-y py-6 transition-opacity data-changing:opacity-60 sm:grid-cols-2 lg:grid-cols-4"
    >
      <FilterSelect
        id="slot-filter-craft"
        label={t("craft")}
        anyLabel={anyLabel}
        options={crafts}
        value={craft}
        disabled={changing}
        onValueChange={setCraft}
      />
      <FilterSelect
        id="slot-filter-city"
        label={t("city")}
        anyLabel={anyLabel}
        options={cities}
        value={cityId}
        disabled={changing}
        onValueChange={setCity}
      />
      <FilterSelect
        id="slot-filter-district"
        label={t("district")}
        anyLabel={cityId ? anyLabel : t("cityFirst")}
        options={districts}
        value={districtId}
        disabled={changing || districts.length === 0}
        onValueChange={setDistrict}
      />

      <div className="flex items-end gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor="slot-filter-date">{t("date")}</FieldLabel>
          <Input
            id="slot-filter-date"
            type="date"
            value={date}
            min={minDate}
            disabled={changing}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        {hasSlotFilters({ filters }) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={t("clear")}
            disabled={changing}
            onClick={clear}
          >
            <X aria-hidden="true" data-icon="inline-start" />
            <span className="sr-only">{t("clear")}</span>
          </Button>
        )}
      </div>
    </section>
  );
}
