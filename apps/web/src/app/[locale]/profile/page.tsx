import { userRoleSchema } from "@local-craftsmen/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile-form";
import { redirect } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getProfileValues } from "@/lib/profile-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("profile");
  const metadata = { title: t("title") };

  return metadata;
};

export default async function ProfilePage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) return redirect({ href: "/login", locale });
  if (user.role !== userRoleSchema.enum.craftsman) return redirect({ href: "/dashboard", locale });
  const [t, profile, locations] = await Promise.all([
    getTranslations("profile"),
    apiClient.me.profile.get(),
    apiClient.locations.list(),
  ]);

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space flex flex-col gap-10">
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="page-heading">{t("heading")}</h1>
        <p className="body-lead text-muted-foreground">{t("description")}</p>
      </div>
      <ProfileForm initialValues={getProfileValues(profile)} locations={locations} />
    </main>
  );
}
