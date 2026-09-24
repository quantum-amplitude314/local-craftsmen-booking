"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import type { SlotFilters } from "@/lib/slot-filters";
import { emptySlotFilters, slotFilterQuery } from "@/lib/slot-filters";

/** Choosing another city drops the district with it, since districts belong to one city. */
const patched = ({ filters, patch }: { filters: SlotFilters; patch: Partial<SlotFilters> }) => {
  const next = { ...filters, ...patch };
  if (patch.cityId !== undefined && patch.cityId !== filters.cityId) next.districtId = "";

  return next;
};

/** The server reads the listing from the URL, so every choice is a navigation. */
export const useSlotFilters = ({ filters }: { filters: SlotFilters }) => {
  const router = useRouter();
  const [changing, startChange] = useTransition();

  const navigate = (next: SlotFilters) =>
    startChange(() =>
      router.replace(
        { pathname: "/slots", query: slotFilterQuery({ filters: next }) },
        {
          scroll: false,
        },
      ),
    );
  const apply = (patch: Partial<SlotFilters>) => navigate(patched({ filters, patch }));
  const controls = {
    changing,
    setCraft: (craft: string) => apply({ craft }),
    setCity: (cityId: string) => apply({ cityId }),
    setDistrict: (districtId: string) => apply({ districtId }),
    setDate: (date: string) => apply({ date }),
    clear: () => navigate(emptySlotFilters),
  };

  return controls;
};
