import { getTranslations } from "next-intl/server";
import { AddAvailabilityButton } from "@/components/add-availability-button";
import { AvailabilitySection } from "@/components/availability-section";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api";
import { getAvailabilityDay } from "@/lib/availability-day";
import type { ScheduleParams } from "@/lib/dashboard-schedules";

/** The craftsman's side of the dashboard: the availability planner, once the profile is set up. */
export async function CraftsmanSchedule({ day, cityId }: ScheduleParams) {
  const [t, profile] = await Promise.all([
    getTranslations("dashboard"),
    apiClient.me.profile.get(),
  ]);

  if (!profile) {
    return (
      <section
        className="flex flex-col items-start gap-4 border-t pt-6"
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

  const { baseArea, rates } = profile;
  const availability = await getAvailabilityDay({ day, cityId, baseArea });

  return (
    <section className="flex flex-col gap-6 border-t pt-6" aria-labelledby="availability-heading">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <h2 id="availability-heading" className="section-heading">
          {t("sections.availability")}
        </h2>
        {rates.length > 0 && <AddAvailabilityButton availability={availability} />}
      </div>
      {rates.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">{t("availability.rateRequired")}</p>
          <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
            {t("availability.editProfile")}
          </Link>
        </div>
      ) : (
        <AvailabilitySection availability={availability} />
      )}
    </section>
  );
}
