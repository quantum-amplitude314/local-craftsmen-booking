import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { routing } from "./src/i18n/routing";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const { locales, defaultLocale } = routing;

/**
 * File paths skip the proxy, so `/abc.txt` would reach `[locale]` with `abc.txt` as its locale,
 * which Cache Components render at request time and hang on workerd. Once public files and app
 * routes miss, the default locale prefix sends it to the prerendered 404.
 */
const unprefixedPathRewrite = {
  source: `/:first((?!(?:${locales.join("|")})(?:/|$))[^/]+)/:rest*`,
  destination: `/${defaultLocale}/:first/:rest*`,
};

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  experimental: { maxPostponedStateSize: "10mb" },
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
  rewrites: async () => ({ beforeFiles: [], afterFiles: [unprefixedPathRewrite], fallback: [] }),
};
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

initOpenNextCloudflareForDev({ environment: "development" });
