import { LOCATIONS, userRoleSchema } from "@local-craftsmen/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ProfileForm, ProfileFormSkeleton } from "@/components/profile-form";
import { SectionError } from "@/components/section-error";
import { SessionGate } from "@/components/session-gate";
import { redirect } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getProfileValues } from "@/lib/profile-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("profile");
  const metadata = { title: t("title") };

  return metadata;
};

async function OwnProfile() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) return null;
  if (user.role !== userRoleSchema.enum.craftsman) return redirect({ href: "/dashboard", locale });
  const profile = await apiClient.me.profile.get();

  return <ProfileForm initialValues={getProfileValues(profile)} locations={LOCATIONS} />;
}

export default async function ProfilePage() {
  const t = await getTranslations("profile");

  return (
    <main id="main-content" tabIndex={-1} className="page-shell flex flex-col gap-8 py-8 sm:py-10">
      <Suspense fallback={null}>
        <SessionGate />
      </Suspense>
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="page-heading">{t("heading")}</h1>
        <p className="body-lead text-muted-foreground">{t("description")}</p>
      </div>
      <SectionError>
        <Suspense fallback={<ProfileFormSkeleton />}>
          <OwnProfile />
        </Suspense>
      </SectionError>
    </main>
  );
}
