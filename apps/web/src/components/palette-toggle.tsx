"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { applySavedPalette, flipPalette } from "@/lib/palette";

export function PaletteToggle() {
  const t = useTranslations("header");

  useEffect(() => {
    applySavedPalette();
    window.addEventListener("focus", applySavedPalette);

    return () => window.removeEventListener("focus", applySavedPalette);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={flipPalette}
      aria-label={t("togglePalette")}
      title={t("togglePalette")}
    >
      <Sun aria-hidden="true" className="hidden dark:block" />
      <Moon aria-hidden="true" className="dark:hidden" />
    </Button>
  );
}
