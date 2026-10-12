import type { MetadataRoute } from "next";
import { localePrefix, routing } from "@/i18n/routing";
import { getWebOrigin } from "@/lib/env";

const PRIVATE_PATHS = ["/dashboard", "/profile", "/craftsmen/"];

const robots = async () => {
  const webOrigin = await getWebOrigin();
  const disallow = routing.locales.flatMap((locale) =>
    PRIVATE_PATHS.map((path) => `${localePrefix(locale)}${path}`),
  );
  const config: MetadataRoute.Robots = {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: `${webOrigin}/sitemap.xml`,
  };

  return config;
};

export default robots;
