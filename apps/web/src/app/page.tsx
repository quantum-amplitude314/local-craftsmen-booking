import type { Craft } from "@local-craftsmen/contracts";
import { ArrowUpRight, MapPin } from "lucide-react";
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
        <p className="border-border border-t py-10 text-muted-foreground">
          No craftsmen are listed yet. Seed the database to add the sample profiles.
        </p>
      );
    }

    return (
      <ol className="grid border-border border-t md:grid-cols-2 lg:grid-cols-3">
        {craftsmen.map(({ id, name, craft, city, hourlyRate, bio }, index) => (
          <li
            key={id}
            className="group border-border border-b py-7 md:odd:border-r md:px-7 md:first:pl-0 lg:border-r lg:px-7 lg:last:border-r-0 lg:nth-[3n+1]:pl-0"
          >
            <article className="flex h-full flex-col gap-10">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    {craftLabels[craft]}
                  </p>
                  <h2 className="text-2xl font-medium tracking-tight">{name}</h2>
                </div>

                <p className="min-h-12 text-sm leading-6 text-muted-foreground">
                  {bio ?? `Available for ${craftLabels[craft].toLowerCase()} work in ${city}.`}
                </p>

                <div className="flex items-end justify-between gap-4 border-border border-t pt-4">
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
    <main className="min-h-screen px-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex h-20 items-center justify-between border-border border-b">
          <p className="text-sm font-semibold tracking-tight">LOCAL / CRAFT</p>
          <p className="font-mono text-xs text-muted-foreground">BERLIN · HAMBURG</p>
        </header>

        <section className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Independent local specialists
            </p>
            <h1 className="max-w-3xl text-5xl leading-[0.95] font-medium tracking-[-0.055em] sm:text-7xl">
              Trusted work,
              <br />
              close to home.
            </h1>
          </div>
          <p className="max-w-md text-base leading-7 text-muted-foreground lg:pb-1">
            Browse skilled craftspeople in your city, compare hourly rates, and find the right
            specialist for the job.
          </p>
        </section>

        <section aria-labelledby="directory-heading" className="pb-20">
          <div className="flex items-end justify-between gap-6 pb-5">
            <div>
              <p className="font-mono text-xs text-muted-foreground">01</p>
              <h2 id="directory-heading" className="mt-2 text-xl font-medium tracking-tight">
                Craftsmen directory
              </h2>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">Current local profiles</p>
          </div>
          <CraftsmenDirectory />
        </section>
      </div>
    </main>
  );
}
