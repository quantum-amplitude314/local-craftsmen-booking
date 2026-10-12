import { LOCATIONS } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache, Suspense } from "react";
import { CraftsmanProfile, CraftsmanProfileSkeleton } from "@/components/craftsman-profile";
import { SectionError } from "@/components/section-error";
import { SessionGate } from "@/components/session-gate";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prepareCraftsmanDetail } from "@/lib/craftsman-detail-model";
import { formattingLocale } from "@/lib/intl-locale";

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

/** Everything that waits for the request streams in here, behind the Card's skeleton. */
async function CraftsmanProfileSection({
  params,
}: Pick<PageProps<"/[locale]/craftsmen/[id]">, "params">) {
  const [{ id }, user, locale] = await Promise.all([params, getCurrentUser(), getLocale()]);
  if (!user) return null;
  const [craftsman, t, craftName, cityName] = await Promise.all([
    findCraftsman(id),
    getTranslations("craftsman"),
    getTranslations("crafts"),
    getTranslations("cities"),
  ]);
  if (!craftsman) notFound();
  const profile = prepareCraftsmanDetail({
    craftsman,
    locations: LOCATIONS,
    locale: formattingLocale(locale),
    text: { craftName, cityName, rate: (rate) => t("rateValue", { rate }) },
  });

  return <CraftsmanProfile profile={profile} />;
}

export default function CraftsmanPage({ params }: PageProps<"/[locale]/craftsmen/[id]">) {
  return (
    <main id="main-content" tabIndex={-1} className="page-shell flex flex-col gap-8 py-8 sm:py-10">
      <Suspense fallback={null}>
        <SessionGate />
      </Suspense>
      <SectionError>
        <Suspense fallback={<CraftsmanProfileSkeleton />}>
          <CraftsmanProfileSection params={params} />
        </Suspense>
      </SectionError>
    </main>
  );
}
