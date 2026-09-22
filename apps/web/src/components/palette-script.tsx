"use client";

export function PaletteScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
    >
      {`document.documentElement.dataset.palette = document.cookie.split("; ").includes("palette=light") ? "light" : "dark";`}
    </script>
  );
}
