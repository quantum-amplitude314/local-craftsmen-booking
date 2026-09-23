import type { Area, CraftsmanRate, SlotListing } from "@local-craftsmen/contracts";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("directory");
  const metadata = { title: t("title") };

  return metadata;
};

const loadSlots = async () => {
  try {
    const slots = await apiClient.slots.list({});

    return slots;
  } catch {
    return null;
  }
};

async function SlotList({ slots }: { slots: SlotListing[] | null }) {
  const [t, tCities, format, locations] = await Promise.all([
    getTranslations("directory"),
    getTranslations("cities"),
    getFormatter(),
    slots ? apiClient.locations.list() : Promise.resolve([]),
  ]);

  const formatArea = ({ cityId, districtId }: Area) => {
    const cityName = tCities(cityId);
    const district = locations
      .find(({ id }) => id === cityId)
      ?.districts.find(({ id }) => id === districtId)?.name;
    const label = district ? t("areaWithDistrict", { district, city: cityName }) : cityName;

    return label;
  };

  const formatRates = (rates: CraftsmanRate[]) => {
    const prices = rates.map(({ currency, hourlyRate }) =>
      format.number(Number(hourlyRate), {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    );
    const label = prices.join(" · ");

    return label;
  };

  const formatTime = ({ start, end }: { start: string; end: string }) => {
    const label = format.dateTimeRange(new Date(start), new Date(end), {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    return label;
  };

  if (!slots) {
    return (
      <div className="border-border border-y py-10" aria-live="polite">
        <p className="font-medium">{t("unavailable")}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("unavailableDescription")}
        </p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="prose-text border-border border-t py-10 text-muted-foreground">{t("empty")}</p>
    );
  }

  return (
    <ul className="grid gap-x-8 border-t md:grid-cols-2 lg:grid-cols-3">
      {slots.map(({ id, start, end, areas, craftsman }) => (
        <li key={id} className="min-w-0 border-b py-8">
          <article className="flex h-full flex-col gap-6">
            <p className="eyebrow text-primary">{t(`crafts.${craftsman.craft}`)}</p>

            <div className="flex flex-1 flex-col gap-4">
              <h2 className="section-heading wrap-anywhere">{craftsman.name}</h2>

              <p className="font-medium">{formatTime({ start, end })}</p>

              <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                  {areas.map(formatArea).join(" · ")}
                </span>
                <span className="text-sm font-medium">
                  {formatRates(craftsman.rates)}
                  <span className="font-normal text-muted-foreground">{t("perHour")}</span>
                </span>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export default async function SlotsPage() {
  const [user, locale, t] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("directory"),
  ]);
  if (!user) return redirect({ href: "/login", locale });
  const slots = await loadSlots();

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space flex flex-col gap-10">
      <h1 className="page-heading">
        {t("heading")}
        {slots && slots.length > 0 && (
          <span className="text-muted-foreground"> · {slots.length}</span>
        )}
      </h1>
      <SlotList slots={slots} />
    </main>
  );
}
