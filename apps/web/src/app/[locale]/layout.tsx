import type { Metadata } from "next";
import { Fraunces, Noto_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "../globals.css";
import { PaletteScript } from "@/components/palette-script";
import { SiteHeader } from "@/components/site-header";
import { type Locale, routing } from "@/i18n/routing";
import { getEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-noto-sans",
});

const OPEN_GRAPH_LOCALES: Record<Locale, string> = { en: "en_US", cs: "cs_CZ" };

export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale, { WEB_ORIGIN: webOrigin }] = await Promise.all([
    getTranslations(),
    getLocale(),
    getEnv(),
  ]);
  const title = t("metadata.title");
  const description = t("metadata.description");
  // The shared image comes from opengraph-image.jpg beside this layout; X falls back to it.
  const metadata: Metadata = {
    metadataBase: new URL(webOrigin),
    title,
    description,
    openGraph: {
      type: "website",
      siteName: t("shell.brand"),
      title,
      description,
      locale: OPEN_GRAPH_LOCALES[locale],
    },
    twitter: { card: "summary_large_image" },
  };

  return metadata;
};

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations("shell");

  return (
    <html
      lang={locale}
      data-palette="dark"
      suppressHydrationWarning
      className={cn("h-full antialiased", notoSans.variable, fraunces.variable)}
    >
      <head>
        <PaletteScript />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {t("skipToContent")}
          </a>
          <SiteHeader />
          {children}
          <footer className="dashboard-shell mt-auto flex flex-wrap justify-between gap-2 border-t py-6 text-xs text-muted-foreground">
            <p>{t("brand")}</p>
            <p>{t("tagline")}</p>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
