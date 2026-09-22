"use client";

import Script from "next/script";
import { useLocale } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { readAppliedPalette, subscribeToPaletteChange } from "@/lib/palette";

/** Explicit-render API of https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit */
type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  remove: (widgetId: string) => void;
};

type TurnstileRenderOptions = {
  sitekey: string;
  language: string;
  theme: "light" | "dark";
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  "timeout-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const turnstileScriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const readServerPalette = () => "dark" as const;

/**
 * Always-visible Turnstile widget. It renders inside the surrounding form, where Turnstile adds
 * the `cf-turnstile-response` input, and is recreated whenever the locale or palette changes.
 * Remount it with a new `key` to get a fresh token after a failed submission.
 */
export function TurnstileWidget({
  onTokenChange,
}: {
  onTokenChange: (token: string | null) => void;
}) {
  const language = useLocale();
  const theme = useSyncExternalStore(
    subscribeToPaletteChange,
    readAppliedPalette,
    readServerPalette,
  );
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const { turnstile } = window;
    if (!isScriptReady || !container || !turnstile) return;

    const clearToken = () => onTokenChange(null);
    const widgetId = turnstile.render(container, {
      sitekey: siteKey,
      language,
      theme,
      size: "flexible",
      callback: onTokenChange,
      "expired-callback": clearToken,
      "error-callback": clearToken,
      "timeout-callback": clearToken,
    });

    return () => {
      turnstile.remove(widgetId);
      clearToken();
    };
  }, [container, isScriptReady, language, theme, onTokenChange]);

  return (
    <>
      <Script src={turnstileScriptUrl} onReady={() => setIsScriptReady(true)} />
      <div ref={setContainer} className="min-h-16.25" />
    </>
  );
}
