import { getLocale } from "next-intl/server";
import { HowItWorks } from "@/components/how-it-works";
import { LandingHero } from "@/components/landing-hero";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (user) return redirect({ href: "/dashboard", locale });

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-shell">
      <LandingHero />
      <HowItWorks />
    </main>
  );
}
