import { notFound } from "next/navigation";
import { locale as localeRootParam } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await localeRootParam());
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const { default: messages } = await import(`../../messages/${requestedLocale}.json`);
  const config = { locale: requestedLocale, messages };

  return config;
});
