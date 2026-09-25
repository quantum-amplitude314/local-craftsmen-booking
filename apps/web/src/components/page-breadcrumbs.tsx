"use client";

import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";

export function PageBreadcrumbs({ current }: { current: "dashboard" | "profile" }) {
  const t = useTranslations("header");

  return (
    <Breadcrumb aria-label={t("breadcrumb")}>
      <BreadcrumbList>
        <BreadcrumbItem>
          {current === "dashboard" ? (
            <BreadcrumbPage>{t("dashboard")}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href="/dashboard" />}>{t("dashboard")}</BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {current !== "dashboard" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t(current)}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
