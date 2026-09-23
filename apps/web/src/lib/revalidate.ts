import "server-only";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/** Revalidates each path under every locale's URL prefix. */
export const revalidateLocalized = (paths: string[]) => {
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    for (const path of paths) revalidatePath(`${prefix}${path}`);
  }
};
