import { getTranslations } from "next-intl/server";
import { AvailabilityPlanner } from "@/components/availability-planner";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";

export async function CraftsmanDashboard({ day }: { day: string | undefined }) {
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

  const [schedule, locations] = await Promise.all([
    apiClient.me.availability.day(day ? { date: day } : {}),
    apiClient.locations.list(),
  ]);
  const { baseArea, rates } = profile;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section
        className="flex min-w-0 flex-col gap-6 border-t pt-6"
        aria-labelledby="availability-heading"
      >
        <h2 id="availability-heading" className="section-heading">
          {t("sections.availability")}
        </h2>
        {rates.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-muted-foreground">{t("availability.rateRequired")}</p>
            <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
              {t("availability.editProfile")}
            </Link>
          </div>
        ) : (
          <AvailabilityPlanner schedule={schedule} baseArea={baseArea} locations={locations} />
        )}
      </section>
      <section
        className="flex min-w-0 flex-col gap-3 border-t pt-6"
        aria-labelledby="bookings-heading"
      >
        <h2 id="bookings-heading" className="section-heading">
          {t("sections.bookings")}
        </h2>
        <p className="text-muted-foreground">{t("comingNext")}</p>
      </section>
    </div>
  );
}
