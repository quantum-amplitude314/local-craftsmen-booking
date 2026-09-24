import { type CraftsmanDetail, type Location, userRoleSchema } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { SlotCard } from "@/components/slot-card";
import { redirect } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prepareCraftsmanDetail } from "@/lib/craftsman-detail-model";
import { formattingLocale } from "@/lib/intl-locale";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("craftsman");
  const metadata = { title: t("title") };

  return metadata;
};

type PageData = { detail: CraftsmanDetail; locations: Location[] } | "notFound" | "unavailable";

const loadPageData = async ({ id }: { id: string }): Promise<PageData> => {
  try {
    const [detail, locations] = await Promise.all([
      apiClient.craftsmen.find({ id }),
      apiClient.locations.list(),
    ]);
    const data = { detail, locations };

    return data;
  } catch (error) {
    if (error instanceof ORPCError && error.code === "NOT_FOUND") return "notFound";

    return "unavailable";
  }
};

export default async function CraftsmanPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, locale, t, cityName] = await Promise.all([
    params,
    getCurrentUser(),
    getLocale(),
    getTranslations("craftsman"),
    getTranslations("cities"),
  ]);
  if (!user) return redirect({ href: "/login", locale });
  const data = await loadPageData({ id });
  if (data === "notFound") notFound();
  if (data === "unavailable") {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="page-shell section-space flex flex-col gap-10"
      >
        <PageBreadcrumbs current="craftsman" label={t("breadcrumbFallback")} />
        <div className="border-border border-y py-10" aria-live="polite">
          <p className="font-medium">{t("unavailable")}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("unavailableDescription")}
          </p>
        </div>
      </main>
    );
  }

  const { detail, locations } = data;
  const model = prepareCraftsmanDetail({
    detail,
    locations,
    locale: formattingLocale(locale),
    text: {
      craftName: (craft) => t(`crafts.${craft}`),
      cityName,
      wholeCity: (city) => t("wholeCity", { city }),
      zoneNote: ({ city, zone }) => t("zoneNote", { city, zone }),
      perHour: t("perHour"),
      noBio: t("noBio"),
      noRate: t("noRate"),
    },
  });
  const { name, craftLabel, baseAreaLabel, rateLabel, rateSuffix, bio, slots } = model;
  const bookable = user.role === userRoleSchema.enum.customer;

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space flex flex-col gap-10">
      <PageBreadcrumbs current="craftsman" label={name} />

      <header className="flex max-w-3xl flex-col gap-4">
        <p className="eyebrow text-primary">{craftLabel}</p>
        <h1 className="page-heading">{name}</h1>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("basedIn")}</dt>
            <dd className="font-medium">{baseAreaLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("rate")}</dt>
            <dd className="font-medium">
              {rateLabel}
              <span className="font-normal text-muted-foreground">{rateSuffix}</span>
            </dd>
          </div>
        </dl>
        <p className="prose-text text-muted-foreground">{bio}</p>
      </header>

      <section aria-labelledby="craftsman-availability" className="flex flex-col gap-4">
        <h2 id="craftsman-availability" className="section-heading">
          {t("availability")}
        </h2>
        {slots.length === 0 ? (
          <p className="prose-text border-y py-10 text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
            {slots.map((card) => (
              <SlotCard key={card.id} card={card} bookable={bookable} identity="hidden" />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
