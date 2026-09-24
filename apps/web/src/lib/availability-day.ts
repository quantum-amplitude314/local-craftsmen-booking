import "server-only";

import {
  type Area,
  type CityId,
  SLOT_MAX_MINUTES,
  SLOT_MIN_MINUTES,
} from "@local-craftsmen/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import { apiClient } from "@/lib/api";
import { prepareAvailability } from "@/lib/availability-model";
import { formattingLocale } from "@/lib/intl-locale";

/** Reads one day of the craftsman's own schedule and prepares everything the planner shows. */
export const getAvailabilityDay = async ({
  day,
  cityId,
  baseArea,
}: {
  day: string | undefined;
  cityId: CityId | undefined;
  baseArea: Area;
}) => {
  const requestedDay = { ...(day ? { date: day } : {}), ...(cityId ? { cityId } : {}) };
  const [schedule, locations, locale, t, tDashboard, cityName] = await Promise.all([
    apiClient.me.availability.day(requestedDay),
    apiClient.locations.list(),
    getLocale(),
    getTranslations("dashboard.availability"),
    getTranslations("dashboard"),
    getTranslations("cities"),
  ]);
  const availability = prepareAvailability({
    schedule,
    locations,
    baseArea,
    locale: formattingLocale(locale),
    text: {
      cityName,
      zoneNote: (values) => tDashboard("timeZone", values),
      hints: {
        pickRange: t("pickRange"),
        tooShort: t("tooShort", { hours: SLOT_MIN_MINUTES / 60 }),
        tooLong: t("tooLong", { hours: SLOT_MAX_MINUTES / 60 }),
      },
      errors: {
        invalid: t("errors.invalid"),
        occupied: t("errors.occupied"),
        saveFailed: t("errors.saveFailed"),
        unauthorized: t("errors.unauthorized"),
      },
      saved: t("saved"),
    },
  });

  return availability;
};
