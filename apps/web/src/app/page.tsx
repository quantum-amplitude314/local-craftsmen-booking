import type { Craft } from "@local-craftsmen/contracts";
import { MapPin } from "lucide-react";
import { apiClient } from "@/lib/api";

export const dynamic = "force-dynamic";

const hourlyRateFormatter = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const craftLabels: Record<Craft, string> = {
  painter: "Painter",
  plumber: "Plumber",
  electrician: "Electrician",
  carpenter: "Carpenter",
  tiler: "Tiler",
};

async function CraftsmenDirectory() {
  try {
    const craftsmen = await apiClient.craftsmen.list({});

    if (craftsmen.length === 0) {
      return (
        <p className="prose-text border-border border-t py-10 text-muted-foreground">
          No craftsmen are listed yet. Seed the database to add the sample profiles.
        </p>
      );
    }

    return (
      <ol className="grid gap-x-8 border-t md:grid-cols-2 lg:grid-cols-3">
        {craftsmen.map(({ id, name, craft, city, hourlyRate, bio }, index) => (
          <li key={id} className="min-w-0 border-b py-8">
            <article className="flex h-full flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <p className="eyebrow text-primary">{craftLabels[craft]}</p>
                <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <h3 className="section-heading wrap-anywhere">{name}</h3>

                <p className="prose-text min-h-12 text-sm leading-6 text-muted-foreground">
                  {bio ?? `Available for ${craftLabels[craft].toLowerCase()} work in ${city}.`}
                </p>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin aria-hidden="true" className="size-4" />
                    {city}
                  </span>
                  <span className="text-sm font-medium">
                    {hourlyRateFormatter.format(hourlyRate)}
                    <span className="font-normal text-muted-foreground"> / hour</span>
                  </span>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    );
  } catch {
    return (
      <div className="border-border border-y py-10" aria-live="polite">
        <p className="font-medium">The directory is unavailable.</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Start and seed PostgreSQL, then run the API to load craftsmen from the local database.
        </p>
      </div>
    );
  }
}

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="page-shell">
      <section className="section-space grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-12">
        <div>
          <p className="eyebrow mb-6 text-primary">Independent local specialists</p>
          <h1 className="display-heading max-w-3xl">
            Trusted work,
            <br />
            close to home.
          </h1>
        </div>
        <p className="body-lead max-w-md text-muted-foreground lg:pb-1">
          Browse skilled craftspeople in your city, compare hourly rates, and find the right
          specialist for the job.
        </p>
      </section>

      <section aria-labelledby="directory-heading" className="pb-(--section-space)">
        <div className="flex items-end justify-between gap-6 pb-5">
          <div>
            <p className="font-mono text-xs text-muted-foreground">01</p>
            <h2 id="directory-heading" className="section-heading mt-2">
              Craftsmen directory
            </h2>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">Current local profiles</p>
        </div>
        <CraftsmenDirectory />
      </section>
    </main>
  );
}
