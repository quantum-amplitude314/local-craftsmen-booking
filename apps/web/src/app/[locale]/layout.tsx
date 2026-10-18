import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "../globals.css";
import { PaletteScript } from "@/components/palette-script";
import { QaCredit } from "@/components/qa-credit";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { appVersion } from "@/lib/app-version";
import { getWebOrigin } from "@/lib/env";

/** The files the @font-face rules in globals.css load; preloading starts them with the HTML. */
const FONT_FILES = ["/fonts/fraunces-v1.woff2", "/fonts/noto-sans-v1.woff2"];

const OPEN_GRAPH_LOCALES: Record<Locale, string> = { en: "en_US", cs: "cs_CZ" };

/** Written by packages/maintain/brand/build.sh; X falls back to it. */
const SHARE_IMAGE = { url: "/og-image-v1.jpg", type: "image/jpeg", width: 1200, height: 630 };

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale, webOrigin] = await Promise.all([
    getTranslations(),
    getLocale(),
    getWebOrigin(),
  ]);
  const title = t("metadata.title");
  const description = t("metadata.description");
  const brand = t("shell.brand");
  // The icons and the share image are files in public/, served without running the Worker.
  const metadata: Metadata = {
    metadataBase: new URL(webOrigin),
    title,
    description,
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      ],
      apple: { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title,
      description,
      locale: OPEN_GRAPH_LOCALES[locale],
      images: { ...SHARE_IMAGE, alt: brand },
    },
    twitter: { card: "summary_large_image" },
  };

  return metadata;
};

/** Renders for any first segment; i18n/request.ts resolves it to a supported locale. */
export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("shell")]);

  return (
    <html lang={locale} data-palette="dark" suppressHydrationWarning className="h-full antialiased">
      <head>
        <PaletteScript />
        {FONT_FILES.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {t("skipToContent")}
          </a>
          {children}
          <footer className="dashboard-shell mt-auto border-t py-6 text-xs text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="flex gap-3">
                <span>{t("brand")}</span>
                <Link href="/contact" className="transition-colors hover:text-foreground">
                  {t("contact")}
                </Link>
              </p>
              <p>{t("tagline")}</p>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
              <p className="col-start-2">
                <QaCredit label={t("credit")} />
              </p>
              <p className="justify-self-end">{appVersion}</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
