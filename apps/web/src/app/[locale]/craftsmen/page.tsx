import type { Area, CraftsmanProfile } from "@local-craftsmen/contracts";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

const RATE_CURRENCIES = ["CZK", "EUR"] as const;

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("directory");
  const metadata = { title: t("title") };

  return metadata;
};

const loadCraftsmen = async () => {
  try {
    const craftsmen = await apiClient.craftsmen.list({});

    return craftsmen;
  } catch {
    return null;
  }
};

async function CraftsmenList({ craftsmen }: { craftsmen: CraftsmanProfile[] | null }) {
  const [t, tCities, format] = await Promise.all([
    getTranslations("directory"),
    getTranslations("cities"),
    getFormatter(),
  ]);

  const formatArea = ({ city, district }: Area) => {
    const cityName = city.kind === "maintained" ? tCities(city.id) : city.name;
    const label = district ? t("areaWithDistrict", { district, city: cityName }) : cityName;

    return label;
  };

  const formatRate = (hourlyRate: number) => {
    const prices = RATE_CURRENCIES.map((currency) =>
      format.number(hourlyRate, { style: "currency", currency, maximumFractionDigits: 0 }),
    );
    const label = prices.join(" · ");

    return label;
  };

  if (!craftsmen) {
    return (
      <div className="border-border border-y py-10" aria-live="polite">
        <p className="font-medium">{t("unavailable")}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("unavailableDescription")}
        </p>
      </div>
    );
  }

  if (craftsmen.length === 0) {
    return (
      <p className="prose-text border-border border-t py-10 text-muted-foreground">{t("empty")}</p>
    );
  }

  return (
    <ul className="grid gap-x-8 border-t md:grid-cols-2 lg:grid-cols-3">
      {craftsmen.map(({ id, name, craft, baseArea, hourlyRate, bio }) => (
        <li key={id} className="min-w-0 border-b py-8">
          <article className="flex h-full flex-col gap-6">
            <p className="eyebrow text-primary">{t(`crafts.${craft}`)}</p>

            <div className="flex flex-1 flex-col gap-4">
              <h2 className="section-heading wrap-anywhere">{name}</h2>

              <p className="prose-text min-h-12 text-sm leading-6 text-muted-foreground">
                {bio ?? t("fallbackBio", { craft })}
              </p>

              <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-4" />
                  {formatArea(baseArea)}
                </span>
                <span className="text-sm font-medium">
                  {formatRate(hourlyRate)}
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

export default async function CraftsmenPage() {
  const [user, locale, t] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("directory"),
  ]);
  if (!user) return redirect({ href: "/login", locale });
  const craftsmen = await loadCraftsmen();

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space flex flex-col gap-10">
      <h1 className="page-heading">
        {t("heading")}
        {craftsmen && craftsmen.length > 0 && (
          <span className="text-muted-foreground"> · {craftsmen.length}</span>
        )}
      </h1>
      <CraftsmenList craftsmen={craftsmen} />
    </main>
  );
}
