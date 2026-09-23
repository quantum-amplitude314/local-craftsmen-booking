"use client";

import { hasLocale, useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const useLocaleNavigation = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const changeLocale = (nextLocale: string) => {
    if (!hasLocale(routing.locales, nextLocale) || nextLocale === locale) return;
    const { search, hash } = window.location;
    startTransition(() =>
      router.replace(`${pathname}${search}${hash}`, { locale: nextLocale, scroll: false }),
    );
  };
  const navigation = { locale, pending, changeLocale };

  return navigation;
};
