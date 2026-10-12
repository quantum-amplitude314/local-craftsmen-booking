"use client";

import { catchError, type ErrorInfo } from "next/error";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

function SectionErrorMessage({
  digest,
  onRetry,
}: {
  digest: string | undefined;
  onRetry: () => void;
}) {
  const t = useTranslations("errorPage");

  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-6">
      <p className="text-muted-foreground">{t("section")}</p>
      <Button variant="outline" onClick={onRetry}>
        {t("retry")}
      </Button>
      {digest && <p className="text-xs text-muted-foreground">{t("code", { digest })}</p>}
    </div>
  );
}

const renderSectionError = (_props: Record<string, unknown>, { error, retry }: ErrorInfo) => {
  const { digest } = error as Error & { digest?: string };

  return <SectionErrorMessage digest={digest} onRetry={retry} />;
};

export const SectionError = catchError(renderSectionError);
