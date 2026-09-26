"use client";

import { useTranslations } from "next-intl";
import { PhotoHero } from "@/components/photo-hero";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("errorPage");
  const { digest } = error;

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-shell">
      <PhotoHero watermark="500" heading={t("heading")}>
        <p className="body-lead text-muted-foreground">{t("description")}</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={retry}>
            {t("retry")}
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t("home")}
          </Link>
        </div>
        {digest && <p className="text-xs text-muted-foreground">{t("code", { digest })}</p>}
      </PhotoHero>
    </main>
  );
}
