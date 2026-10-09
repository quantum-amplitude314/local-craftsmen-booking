"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { logout } from "@/app/auth-actions";

/**
 * Stands in for a page whose session the API rejected: signs out, which clears the cookies and
 * opens sign-in.
 */
export function SessionExpired() {
  const locale = useLocale();

  useEffect(() => {
    void logout({ locale });
  }, [locale]);

  return null;
}
