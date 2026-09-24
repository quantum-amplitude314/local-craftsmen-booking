/**
 * Plain "en" names zones "GMT+2" and dates "Jul 1"; en-GB gives the CET/CEST and "1 Jul" forms
 * this audience expects. Used wherever the server formats dates for a page locale.
 */
export const formattingLocale = (locale: string) => (locale === "en" ? "en-GB" : locale);
