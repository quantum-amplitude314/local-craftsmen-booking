import { ORPCError } from "@orpc/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache, Suspense } from "react";
import { CraftsmanProfile, CraftsmanProfileSkeleton } from "@/components/craftsman-profile";
import { redirect } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prepareCraftsmanDetail } from "@/lib/craftsman-detail-model";
import { formattingLocale } from "@/lib/intl-locale";

/** One read per request for the title and the page; an id without a profile reads as none. */
const findCraftsman = cache(async (id: string) => {
  try {
    const craftsman = await apiClient.craftsmen.find({ id });

    return craftsman;
  } catch (error) {
    if (error instanceof ORPCError && error.code === "NOT_FOUND") return null;
    throw error;
  }
});

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/craftsmen/[id]">): Promise<Metadata> => {
  const [{ id }, user, t] = await Promise.all([
    params,
    getCurrentUser(),
    getTranslations("craftsman"),
  ]);
  const craftsman = user ? await findCraftsman(id) : null;
  const metadata: Metadata = craftsman ? { title: t("title", { name: craftsman.name }) } : {};

  return metadata;
};

/** Everything that waits for the API streams in here, behind the Card's skeleton. */
async function CraftsmanProfileSection({ id }: { id: string }) {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) return redirect({ href: "/login", locale });
  const [craftsman, locations, t, craftName, cityName] = await Promise.all([
    findCraftsman(id),
    apiClient.locations.list(),
    getTranslations("craftsman"),
    getTranslations("crafts"),
    getTranslations("cities"),
  ]);
  if (!craftsman) notFound();
  const profile = prepareCraftsmanDetail({
    craftsman,
    locations,
    locale: formattingLocale(locale),
    text: { craftName, cityName, rate: (rate) => t("rateValue", { rate }) },
  });

  return <CraftsmanProfile profile={profile} />;
}

export default async function CraftsmanPage({ params }: PageProps<"/[locale]/craftsmen/[id]">) {
  const { id } = await params;

  return (
    <main id="main-content" tabIndex={-1} className="page-shell flex flex-col gap-8 py-8 sm:py-10">
      <Suspense fallback={<CraftsmanProfileSkeleton />}>
        <CraftsmanProfileSection id={id} />
      </Suspense>
    </main>
  );
}
