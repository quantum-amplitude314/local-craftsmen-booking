"use client";

import type { Location, SlotListing } from "@local-craftsmen/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { startTransition, useOptimistic, useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import type { Option } from "@/components/option-combobox";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { SlotBookingButton } from "@/components/slot-booking-dialog";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { formattingLocale } from "@/lib/intl-locale";
import { type OfferCardModel, prepareSlotOffer } from "@/lib/slot-offer-model";
import { useScheduleParams } from "@/lib/use-schedule-params";

const PAGE_SIZE = 4;

export type OfferFilterOptions = {
  crafts: Option[];
  cities: Option[];
  districtsByCity: Record<string, Option[]>;
};

/** Craft and city are always chosen; an empty district means any. */
export type OfferFilters = { craft: string; cityId: string; districtId: string };

function OfferCard({ card }: { card: OfferCardModel }) {
  const { timeLabel, craftsmanName, detailLabel, booking } = card;

  return (
    <Item role="listitem" size="sm" className="border-primary/20 bg-primary/10">
      <ItemHeader>
        <ItemTitle className="text-base tabular-nums">{timeLabel}</ItemTitle>
        <SlotBookingButton booking={booking} />
      </ItemHeader>
      <ItemContent className="min-w-0 gap-0.5">
        <p className="font-medium wrap-break-word">{craftsmanName}</p>
        <ItemDescription className="line-clamp-none tabular-nums">{detailLabel}</ItemDescription>
      </ItemContent>
    </Item>
  );
}

/** Keyed by the day and filters, so a new offer starts on its first page. */
function OfferList({
  cards,
  emptyMessage,
}: {
  cards: OfferCardModel[];
  emptyMessage: string | null;
}) {
  const t = useTranslations("dashboard.slots");
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const shown = cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (emptyMessage) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;

  return (
    <>
      <ItemGroup>
        {shown.map((card) => (
          <OfferCard key={card.id} card={card} />
        ))}
      </ItemGroup>
      {pages > 1 && (
        <nav aria-label={t("pagination")} className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("previous")}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {t("page", { page: page + 1, pages })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("next")}
            disabled={page === pages - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </>
  );
}

export function SlotSearch({
  slots,
  locations,
  filters,
  day,
  today,
  options,
}: {
  slots: SlotListing[];
  locations: Location[];
  filters: OfferFilters;
  day: string;
  today: string;
  options: OfferFilterOptions;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { changing, selectDay, selectCraft, selectCity, selectDistrict } = useScheduleParams();
  // A choice shows at once and stays until the server answers with the slots it asks for.
  const [shown, showFilters] = useOptimistic(filters);
  const { craft, cityId, districtId } = shown;
  const { crafts, cities, districtsByCity } = options;
  const districts = districtsByCity[cityId] ?? [];
  const { calendar, cards, emptyMessage } = prepareSlotOffer({
    slots,
    locations,
    day,
    today,
    districtId: filters.districtId,
    locale: formattingLocale(locale),
    text: {
      wholeCity: t("slots.wholeCity"),
      rate: (rate) => t("slots.rate", { rate }),
      window: (parts) => t("slots.window", parts),
      price: (parts) => t("bookings.price", parts),
      empty: t("slots.empty"),
    },
  });
  const choose = ({ patch, navigate }: { patch: Partial<OfferFilters>; navigate: () => void }) =>
    startTransition(() => {
      showFilters({ ...shown, ...patch });
      navigate();
    });

  return (
    // Filters and calendar beside the list only when this column, not the viewport, has room.
    <div className="@container min-w-0">
      <div className="flex flex-col gap-6 @split:flex-row @split:items-start">
        <div className="flex w-full min-w-0 flex-col gap-4 @split:max-w-70">
          <fieldset className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
            <legend className="sr-only">{t("slots.filters.label")}</legend>
            <FieldLabel htmlFor="offer-craft">{t("slots.filters.craft")}</FieldLabel>
            <FilterSelect
              id="offer-craft"
              options={crafts}
              value={craft}
              onValueChange={(next) =>
                choose({ patch: { craft: next }, navigate: () => selectCraft(next) })
              }
            />
            <FieldLabel htmlFor="offer-city">{t("slots.filters.city")}</FieldLabel>
            <FilterSelect
              id="offer-city"
              options={cities}
              value={cityId}
              onValueChange={(next) =>
                choose({
                  patch: { cityId: next, districtId: "" },
                  navigate: () => selectCity(next),
                })
              }
            />
            <FieldLabel htmlFor="offer-district">{t("slots.filters.district")}</FieldLabel>
            <FilterSelect
              id="offer-district"
              anyLabel={t("slots.filters.any")}
              options={districts}
              value={districtId}
              disabled={districts.length === 0}
              onValueChange={(next) =>
                choose({ patch: { districtId: next }, navigate: () => selectDistrict(next) })
              }
            />
          </fieldset>
          <div className="w-full min-w-0 overflow-hidden rounded-xl border">
            <ScheduleCalendar calendar={calendar} onSelect={selectDay} />
          </div>
        </div>
        {/* The controls stay live so the latest choice wins; the list fades only on a slow answer. */}
        <div
          aria-busy={changing}
          data-changing={changing || undefined}
          className="flex min-w-0 flex-1 flex-col gap-3 transition-opacity data-changing:opacity-60 data-changing:delay-300"
        >
          <OfferList
            key={`${day}|${filters.craft}|${filters.cityId}|${filters.districtId}`}
            cards={cards}
            emptyMessage={emptyMessage}
          />
        </div>
      </div>
    </div>
  );
}
