import type { MetadataRoute } from "next";
import { type Locale, localePrefix, routing } from "@/i18n/routing";
import { getEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/", "/contact", "/login", "/register"];

const sitemap = async () => {
  const { WEB_ORIGIN: webOrigin } = await getEnv();
  const localizedUrl = ({ locale, path }: { locale: Locale; path: string }) => {
    const prefix = localePrefix(locale);
    const url = `${webOrigin}${prefix}${prefix && path === "/" ? "" : path}`;

    return url;
  };
  const entries: MetadataRoute.Sitemap = PUBLIC_PATHS.flatMap((path) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, localizedUrl({ locale, path })]),
    );
    const pathEntries = routing.locales.map((locale) => ({
      url: localizedUrl({ locale, path }),
      alternates: { languages },
    }));

    return pathEntries;
  });

  return entries;
};

export default sitemap;
