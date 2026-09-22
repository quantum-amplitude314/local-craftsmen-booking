import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Local Craftsmen",
  description: "Find trusted local craftspeople for your next project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-palette="dark"
      suppressHydrationWarning
      className={cn("h-full antialiased", notoSans.variable, fraunces.variable, geistMono.variable)}
    >
      <head>
        <script>
          {`document.documentElement.dataset.palette = document.cookie.split("; ").includes("palette=light") ? "light" : "dark";`}
        </script>
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <footer className="page-shell mt-auto flex flex-wrap justify-between gap-2 border-t py-6 text-xs text-muted-foreground">
          <p>Local Craftsmen</p>
          <p>Independent skills. Closer to home.</p>
        </footer>
      </body>
    </html>
  );
}
