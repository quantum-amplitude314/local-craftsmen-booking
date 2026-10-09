import { HowItWorks } from "@/components/how-it-works";
import { LandingHero } from "@/components/landing-hero";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="dashboard-shell">
      <LandingHero />
      <HowItWorks />
    </main>
  );
}
