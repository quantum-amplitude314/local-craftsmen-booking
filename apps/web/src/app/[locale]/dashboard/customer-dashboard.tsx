import { getLocale, getTranslations } from "next-intl/server";
import { OwnBookingsList } from "@/components/own-bookings-list";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formattingLocale } from "@/lib/intl-locale";
import { getOwnBookings } from "@/lib/own-bookings";
import { prepareOwnBookings } from "@/lib/own-bookings-model";

export async function CustomerDashboard() {
  const [t, cityName, locale, { bookings, now }] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("cities"),
    getLocale(),
    getOwnBookings(),
  ]);
  const jobs = prepareOwnBookings({
    bookings,
    now,
    locale: formattingLocale(locale),
    text: {
      cityName,
      status: (status) => t(`bookings.status.${status}`),
      cancel: t("bookings.actions.cancel"),
      cancelling: t("bookings.actions.cancelPending"),
      empty: t("bookings.noneBooked"),
    },
  });

  return (
    <>
      <p className="body-lead max-w-xl text-muted-foreground">{t("ready.customer")}</p>
      <section
        className="flex w-full min-w-0 max-w-172 flex-col gap-6 border-t pt-6"
        aria-labelledby="own-bookings-heading"
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          <h2 id="own-bookings-heading" className="section-heading">
            {t("sections.bookings")}
          </h2>
          <Link href="/slots" className={buttonVariants({ variant: "outline" })}>
            {t("browse")}
          </Link>
        </div>
        <OwnBookingsList {...jobs} />
      </section>
    </>
  );
}
