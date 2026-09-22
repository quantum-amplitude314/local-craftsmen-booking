"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { applySavedPalette, flipPalette } from "@/lib/palette";

export function PaletteToggle() {
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
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
    >
      <Sun aria-hidden="true" className="hidden dark:block" />
      <Moon aria-hidden="true" className="dark:hidden" />
    </Button>
  );
}
