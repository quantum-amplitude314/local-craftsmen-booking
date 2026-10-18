import { notFound } from "next/navigation";
import { locale as localeRootParam } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import cs from "../../messages/cs.json";
import en from "../../messages/en.json";
import { routing } from "./routing";

const messagesByLocale = { cs, en };

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await localeRootParam());
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const config = { locale: requestedLocale, messages: messagesByLocale[requestedLocale] };

  return config;
});
