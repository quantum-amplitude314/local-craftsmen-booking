import { locale as localeRootParam } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import cs from "../../messages/cs.json";
import en from "../../messages/en.json";
import { routing } from "./routing";

const messagesByLocale = { cs, en };

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await localeRootParam());
  const supportedLocale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const config = { locale: supportedLocale, messages: messagesByLocale[supportedLocale] };

  return config;
});
