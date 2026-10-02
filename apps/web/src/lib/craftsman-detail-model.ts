import type { CityId, Craft, CraftsmanProfile, Location } from "@local-craftsmen/contracts";
import { areaLabel } from "@/lib/area-label";

export type CraftsmanDetailText = {
  craftName: (craft: Craft) => string;
  cityName: (cityId: CityId) => string;
  rate: (rate: string) => string;
};

export type CraftsmanDetailModel = {
  name: string;
  craft: Craft;
  serviceLabel: string;
  areaLabel: string;
  rateLabels: string[];
  bio: string | null;
};

/** The profile a customer opens from a slot, formatted for the page locale. */
export const prepareCraftsmanDetail = ({
  craftsman,
  locations,
  locale,
  text,
}: {
  craftsman: CraftsmanProfile;
  locations: Location[];
  locale: string;
  text: CraftsmanDetailText;
}) => {
  const { name, craft, baseArea, rates, bio } = craftsman;
  const { craftName, cityName, rate } = text;
  const rateLabels = rates.map(({ currency, hourlyRate }) => {
    const money = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const label = rate(money.format(Number(hourlyRate)));

    return label;
  });
  const model: CraftsmanDetailModel = {
    name,
    craft,
    serviceLabel: craftName(craft),
    areaLabel: areaLabel({ area: baseArea, locations, cityName }),
    rateLabels,
    bio,
  };

  return model;
};
