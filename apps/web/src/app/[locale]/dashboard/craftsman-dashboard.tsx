import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile-form";
import { apiClient } from "@/lib/api";
import { getProfileValues } from "@/lib/profile-form";

export async function CraftsmanDashboard() {
  const [t, profile, locations] = await Promise.all([
    getTranslations("profile"),
    apiClient.me.profile.get(),
    apiClient.locations.list(),
  ]);

  return (
    <section className="flex flex-col gap-8" aria-labelledby="profile-heading">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="profile-heading" className="section-heading">
          {t("heading")}
        </h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <ProfileForm initialValues={getProfileValues(profile)} locations={locations} />
    </section>
  );
}
