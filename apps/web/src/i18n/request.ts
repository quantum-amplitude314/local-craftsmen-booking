import { locale as localeRootParam } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await localeRootParam());
  const resolvedLocale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const { default: messages } = await import(`../../messages/${resolvedLocale}.json`);
  const config = { locale: resolvedLocale, messages };

  return config;
});
