import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const { default: messages } = await import(`../../messages/${resolvedLocale}.json`);
  const config = { locale: resolvedLocale, messages };

  return config;
});
