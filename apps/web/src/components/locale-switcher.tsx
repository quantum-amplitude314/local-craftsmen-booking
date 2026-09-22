"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("header");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const changeLocale = ([nextLocale]: string[]) => {
    if (!hasLocale(routing.locales, nextLocale) || nextLocale === locale) return;
    const { search, hash } = window.location;

    startTransition(() => {
      router.replace(`${pathname}${search}${hash}`, { locale: nextLocale, scroll: false });
    });
  };

  return (
    <ToggleGroup
      aria-label={t("language")}
      aria-busy={pending}
      variant="outline"
      spacing={0}
      value={[locale]}
      onValueChange={changeLocale}
      disabled={pending}
    >
      <ToggleGroupItem value="en" lang="en" aria-label="English" title="English">
        EN
      </ToggleGroupItem>
      <ToggleGroupItem value="cs" lang="cs" aria-label="Čeština" title="Čeština">
        CS
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
