import { CRAFTS, LOCATIONS } from "@local-craftsmen/contracts";
import { getTranslations } from "next-intl/server";
import { type OfferFilterOptions, type OfferFilters, SlotSearch } from "@/components/slot-search";
import { apiClient } from "@/lib/api";
import type { ScheduleParams } from "@/lib/dashboard-schedules";
import { getViewerClock } from "@/lib/viewer-clock";

export async function CustomerSchedule({ day, cityId, craft, districtId }: ScheduleParams) {
  // Craft and city are preselected
  const city = LOCATIONS.find(({ id }) => id === cityId) ?? LOCATIONS[0];
  const filters: OfferFilters = {
    craft: craft ?? CRAFTS[0],
    cityId: city?.id ?? "",
    districtId: city?.districts.some(({ id }) => id === districtId) ? (districtId ?? "") : "",
  };
  const [t, craftName, cityName, { today }, slots] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("crafts"),
    getTranslations("cities"),
    getViewerClock(),
    city
      ? apiClient.slots.list({
          craft: craft ?? CRAFTS[0],
          cityId: city.id,
          ...(filters.districtId ? { districtId: filters.districtId } : {}),
        })
      : [],
  ]);
  // Read once here, so the server render and hydration agree on which quarters have passed.
  const now = new Date().toISOString();
  const options: OfferFilterOptions = {
    crafts: CRAFTS.map((value) => ({ value, label: craftName(value) })),
    cities: LOCATIONS.map(({ id }) => ({ value: id, label: cityName(id) })),
    districtsByCity: Object.fromEntries(
      LOCATIONS.map(({ id, districts }) => [
        id,
        districts.map(({ id: key, name }) => ({ value: key, label: name })),
      ]),
    ),
  };

  return (
    <section className="flex flex-col gap-6 border-t pt-6" aria-labelledby="slots-heading">
      {/* min-h-9 matches the History button beside the other heading. */}
      <div className="flex min-h-9 min-w-0 items-center justify-between gap-4">
        <h2 id="slots-heading" className="section-heading">
          {t("sections.slots")}
        </h2>
      </div>
      <SlotSearch
        slots={slots}
        locations={LOCATIONS}
        filters={filters}
        day={day ?? today}
        today={today}
        now={now}
        options={options}
      />
    </section>
  );
}
