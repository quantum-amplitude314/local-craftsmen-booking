const readPalette = () => {
  const lightEnabled = document.cookie.split("; ").includes("palette=light");

  return lightEnabled ? "light" : "dark";
};

export const applySavedPalette = () => {
  document.documentElement.dataset.palette = readPalette();
};

export const flipPalette = () => {
  const nextPalette = readPalette() === "dark" ? "light" : "dark";

  // biome-ignore lint/suspicious/noDocumentCookie: Apply the preference immediately after a synchronous cookie write.
  document.cookie = `palette=${nextPalette}; Path=/; Max-Age=31536000; SameSite=Lax`;
  applySavedPalette();
};
