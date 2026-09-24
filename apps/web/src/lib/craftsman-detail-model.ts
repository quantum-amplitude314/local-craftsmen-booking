import type { CraftsmanDetail, Currency, Location, SlotListing } from "@local-craftsmen/contracts";
import { areaLabel } from "@/lib/area-label";
import {
  prepareSlotListings,
  type SlotCardModel,
  type SlotListingText,
} from "@/lib/slot-listing-model";

export type CraftsmanDetailModel = {
  id: string;
  name: string;
  craftLabel: string;
  baseAreaLabel: string;
  rateLabel: string;
  rateSuffix: string;
  bio: string;
  slots: SlotCardModel[];
};

export type CraftsmanDetailText = SlotListingText & {
  noBio: string;
  noRate: string;
};

const formatRates = ({
  rates,
  locale,
  noRate,
}: {
  rates: CraftsmanDetail["rates"];
  locale: string;
  noRate: string;
}) => {
  if (rates.length === 0) return noRate;

  const formatters = new Map<Currency, Intl.NumberFormat>();
  const labels = rates.map(({ currency, hourlyRate }) => {
    let formatter = formatters.get(currency);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      formatters.set(currency, formatter);
    }

    return formatter.format(Number(hourlyRate));
  });
  const result = labels.join(" · ");

  return result;
};

export const prepareCraftsmanDetail = ({
  detail,
  locations,
  locale,
  text,
}: {
  detail: CraftsmanDetail;
  locations: Location[];
  locale: string;
  text: CraftsmanDetailText;
}) => {
  const { id, name, craft, baseArea, rates, bio, availability } = detail;
  const craftsman = { id, name, craft, rates };
  const listings: SlotListing[] = availability.map((slot) => ({ ...slot, craftsman }));
  const model: CraftsmanDetailModel = {
    id,
    name,
    craftLabel: text.craftName(craft),
    baseAreaLabel: areaLabel({ area: baseArea, locations, cityName: text.cityName }),
    rateLabel: formatRates({ rates, locale, noRate: text.noRate }),
    rateSuffix: rates.length > 0 ? text.perHour : "",
    bio: bio || text.noBio,
    slots: prepareSlotListings({ slots: listings, locations, locale, text }),
  };

  return model;
};
