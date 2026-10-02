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

/** Pages named in the messages pass their key; a page named by its content passes the name. */
export function PageBreadcrumbs({
  current,
}: {
  current: "dashboard" | "profile" | { name: string };
}) {
  const t = useTranslations("header");
  const currentLabel = typeof current === "string" ? t(current) : current.name;

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
              <BreadcrumbPage className="wrap-anywhere">{currentLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
