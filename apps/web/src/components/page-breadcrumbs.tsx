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

type PageBreadcrumbsProps =
  | { current: "dashboard" | "profile" | "slots"; label?: never }
  | { current: "craftsman"; label: string };

export function PageBreadcrumbs(props: PageBreadcrumbsProps) {
  const { current } = props;
  const t = useTranslations("header");
  const currentLabel = current === "craftsman" ? props.label : t(current);

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
        {current === "craftsman" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/slots" />}>{t("slots")}</BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {current !== "dashboard" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
