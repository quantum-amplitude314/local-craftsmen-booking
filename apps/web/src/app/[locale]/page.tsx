import { MapPin } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { apiClient } from "@/lib/api";

export const dynamic = "force-dynamic";

async function CraftsmenDirectory() {
  const [t, format] = await Promise.all([getTranslations("home"), getFormatter()]);

  try {
    const craftsmen = await apiClient.craftsmen.list({});

    if (craftsmen.length === 0) {
      return (
        <p className="prose-text border-border border-t py-10 text-muted-foreground">
          {t("empty")}
        </p>
      );
    }

    return (
      <ul className="grid gap-x-8 border-t md:grid-cols-2 lg:grid-cols-3">
        {craftsmen.map(({ id, name, craft, city, hourlyRate, bio }) => (
          <li key={id} className="min-w-0 border-b py-8">
            <article className="flex h-full flex-col gap-6">
              <p className="eyebrow text-primary">{t(`crafts.${craft}`)}</p>

              <div className="flex flex-1 flex-col gap-4">
                <h3 className="section-heading wrap-anywhere">{name}</h3>

                <p className="prose-text min-h-12 text-sm leading-6 text-muted-foreground">
                  {bio ?? t("fallbackBio", { craft, city })}
                </p>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin aria-hidden="true" className="size-4" />
                    {city}
                  </span>
                  <span className="text-sm font-medium">
                    {format.number(hourlyRate, {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    })}
                    <span className="font-normal text-muted-foreground">{t("perHour")}</span>
                  </span>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    );
  } catch {
    return (
      <div className="border-border border-y py-10" aria-live="polite">
        <p className="font-medium">{t("unavailable")}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("unavailableDescription")}
        </p>
      </div>
    );
  }
}

export default async function Home() {
  const t = await getTranslations("home");

  return (
    <main id="main-content" tabIndex={-1} className="page-shell">
      <section className="section-space grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-12">
        <div>
          <p className="eyebrow mb-6 text-primary">{t("eyebrow")}</p>
          <h1 className="display-heading max-w-3xl">{t.rich("heading", { br: () => <br /> })}</h1>
        </div>
        <p className="body-lead max-w-md text-muted-foreground lg:pb-1">{t("description")}</p>
      </section>

      <section aria-labelledby="directory-heading" className="pb-(--section-space)">
        <h2 id="directory-heading" className="section-heading pb-5">
          {t("directory")}
        </h2>
        <CraftsmenDirectory />
      </section>
    </main>
  );
}
