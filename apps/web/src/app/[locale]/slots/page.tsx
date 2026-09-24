import {
  CRAFTS,
  type Location,
  type SlotListing,
  type SlotSearch,
} from "@local-craftsmen/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { SlotCard } from "@/components/slot-card";
import { SlotFilterBar, type SlotFilterOptions } from "@/components/slot-filters";
import { redirect } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { formattingLocale } from "@/lib/intl-locale";
import { hasSlotFilters, readSlotFilters, type SlotFilters } from "@/lib/slot-filters";
import { prepareSlotListings } from "@/lib/slot-listing-model";
import { getViewerClock } from "@/lib/viewer-clock";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("directory");
  const metadata = { title: t("title") };

  return metadata;
};

type Offer = { slots: SlotListing[]; locations: Location[] } | null;

const loadOffer = async ({ search }: { search: SlotSearch }): Promise<Offer> => {
  try {
    const [slots, locations] = await Promise.all([
      apiClient.slots.list(search),
      apiClient.locations.list(),
    ]);
    const offer = { slots, locations };

    return offer;
  } catch {
    return null;
  }
};

async function SlotList({
  offer,
  bookable,
  filtered,
}: {
  offer: Offer;
  bookable: boolean;
  filtered: boolean;
}) {
  const [t, cityName, locale] = await Promise.all([
    getTranslations("directory"),
    getTranslations("cities"),
    getLocale(),
  ]);

  if (!offer) {
    return (
      <div className="border-border border-y py-10" aria-live="polite">
        <p className="font-medium">{t("unavailable")}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("unavailableDescription")}
        </p>
      </div>
    );
  }

  const { slots, locations } = offer;
  if (slots.length === 0) {
    return (
      <p className="prose-text py-10 text-muted-foreground">
        {filtered ? t("emptyFiltered") : t("empty")}
      </p>
    );
  }

  const cards = prepareSlotListings({
    slots,
    locations,
    locale: formattingLocale(locale),
    text: {
      craftName: (craft) => t(`crafts.${craft}`),
      cityName,
      wholeCity: (city) => t("wholeCity", { city }),
      zoneNote: ({ city, zone }) => t("zoneNote", { city, zone }),
      perHour: t("perHour"),
    },
  });

  return (
    <ul className="grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <SlotCard key={card.id} card={card} bookable={bookable} />
      ))}
    </ul>
  );
}

const buildFilterOptions = async ({ locations }: { locations: Location[] }) => {
  const [t, cityName] = await Promise.all([
    getTranslations("directory"),
    getTranslations("cities"),
  ]);
  const options: SlotFilterOptions = {
    crafts: CRAFTS.map((value) => ({ value, label: t(`crafts.${value}`) })),
    cities: locations.map(({ id }) => ({ value: id, label: cityName(id) })),
    districtsByCity: Object.fromEntries(
      locations.map(({ id, districts }) => [
        id,
        districts.map(({ id: districtId, name }) => ({ value: districtId, label: name })),
      ]),
    ),
  };

  return options;
};

async function Filters({ filters, locations }: { filters: SlotFilters; locations: Location[] }) {
  const [options, { today }] = await Promise.all([
    buildFilterOptions({ locations }),
    getViewerClock(),
  ]);

  return <SlotFilterBar filters={filters} options={options} minDate={today} />;
}

export default async function SlotsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, locale, t, params] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("directory"),
    searchParams,
  ]);
  if (!user) return redirect({ href: "/login", locale });
  const { search, filters } = readSlotFilters({ params });
  const offer = await loadOffer({ search });
  const count = offer?.slots.length ?? 0;

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space flex flex-col gap-10">
      <PageBreadcrumbs current="slots" />
      <h1 className="page-heading">
        {t("heading")}
        {count > 0 && <span className="text-muted-foreground"> · {count}</span>}
      </h1>
      {offer && <Filters filters={filters} locations={offer.locations} />}
      <SlotList
        offer={offer}
        bookable={user.role === "customer"}
        filtered={hasSlotFilters({ filters })}
      />
    </main>
  );
}
