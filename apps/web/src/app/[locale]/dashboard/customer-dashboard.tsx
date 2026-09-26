import { CRAFTS } from "@local-craftsmen/contracts";
import { getTranslations } from "next-intl/server";
import { BookingCalendar } from "@/components/booking-calendar";
import { BookingHistoryButton } from "@/components/booking-history-button";
import { type OfferFilterOptions, type OfferFilters, SlotSearch } from "@/components/slot-search";
import { apiClient } from "@/lib/api";
import type { ScheduleParams } from "@/lib/dashboard-schedules";
import { getMonthBookings } from "@/lib/month-bookings";

export async function CustomerDashboard({
  day,
  cityId,
  craft,
  districtId,
  jobDay,
}: ScheduleParams) {
  const [t, craftName, cityName, locations, bookings] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("crafts"),
    getTranslations("cities"),
    apiClient.locations.list(),
    getMonthBookings({ day: jobDay }),
  ]);
  const { today } = bookings.clock;
  // Craft and city are always chosen, the first of each until the customer picks; a district
  // outside the city is dropped.
  const city = locations.find(({ id }) => id === cityId) ?? locations[0];
  const filters: OfferFilters = {
    craft: craft ?? CRAFTS[0],
    cityId: city?.id ?? "",
    districtId: city?.districts.some(({ id }) => id === districtId) ? (districtId ?? "") : "",
  };
  const slots = city
    ? await apiClient.slots.list({
        craft: craft ?? CRAFTS[0],
        cityId: city.id,
        ...(filters.districtId ? { districtId: filters.districtId } : {}),
      })
    : [];
  const options: OfferFilterOptions = {
    crafts: CRAFTS.map((value) => ({ value, label: craftName(value) })),
    cities: locations.map(({ id }) => ({ value: id, label: cityName(id) })),
    districtsByCity: Object.fromEntries(
      locations.map(({ id, districts }) => [
        id,
        districts.map(({ id: key, name }) => ({ value: key, label: name })),
      ]),
    ),
  };

  return (
    // Two equal columns from xl, where each still fits its calendar beside the cards.
    <div className="flex flex-col gap-10 xl:flex-row xl:items-start">
      <section
        className="flex w-full min-w-0 max-w-172 flex-1 flex-col gap-6 border-t pt-6"
        aria-labelledby="slots-heading"
      >
        {/* min-h-9 matches the History button beside the other heading. */}
        <div className="flex min-h-9 min-w-0 items-center justify-between gap-4">
          <h2 id="slots-heading" className="section-heading">
            {t("sections.slots")}
          </h2>
        </div>
        <SlotSearch
          slots={slots}
          locations={locations}
          filters={filters}
          day={day ?? today}
          today={today}
          options={options}
        />
      </section>
      <section
        className="flex w-full min-w-0 max-w-172 flex-1 flex-col gap-6 border-t pt-6"
        aria-labelledby="bookings-heading"
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          <h2 id="bookings-heading" className="section-heading">
            {t("sections.bookings")}
          </h2>
          <BookingHistoryButton />
        </div>
        <BookingCalendar {...bookings} />
      </section>
    </div>
  );
}
