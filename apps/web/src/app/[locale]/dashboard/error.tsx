"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DashboardError({ retry }: { retry: () => void }) {
  const t = useTranslations("dashboard");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="page-shell section-space flex flex-col items-start gap-6"
    >
      <h1 className="page-heading max-w-2xl">{t("unavailable")}</h1>
      <p className="body-lead text-muted-foreground">{t("unavailableDescription")}</p>
      <Button onClick={retry}>{t("retry")}</Button>
    </main>
  );
}
