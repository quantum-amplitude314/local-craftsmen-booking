import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";

export async function CraftsmanDashboard() {
  const [t, profile] = await Promise.all([
    getTranslations("dashboard"),
    apiClient.me.profile.get(),
  ]);

  if (!profile) {
    return (
      <section
        className="flex max-w-2xl flex-col items-start gap-4 border-y py-8"
        aria-labelledby="profile-setup-heading"
      >
        <h2 id="profile-setup-heading" className="section-heading">
          {t("profileSetup.heading")}
        </h2>
        <p className="text-muted-foreground">{t("profileSetup.description")}</p>
        <Link href="/profile" className={buttonVariants({ size: "lg" })}>
          {t("profileSetup.action")}
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      {(["availability", "bookings"] as const).map((section) => (
        <section
          key={section}
          className="flex flex-col gap-3 border-t pt-6"
          aria-labelledby={`${section}-heading`}
        >
          <h2 id={`${section}-heading`} className="section-heading">
            {t(`sections.${section}`)}
          </h2>
          <p className="text-muted-foreground">{t("comingNext")}</p>
        </section>
      ))}
    </div>
  );
}
