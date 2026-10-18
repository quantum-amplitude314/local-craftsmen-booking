import { getTranslations } from "next-intl/server";
import { PhotoHero } from "@/components/photo-hero";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-shell">
      <PhotoHero watermark="404" heading={t("notFound.heading")}>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            {t("notFound.home")}
          </Link>
          <Link href="/register" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t("home.findCraftsman")}
          </Link>
        </div>
      </PhotoHero>
    </main>
  );
}
