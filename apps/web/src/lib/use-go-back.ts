"use client";

import { useRouter } from "@/i18n/navigation";

export const useGoBack = ({ fallback }: { fallback: string }) => {
  const router = useRouter();
  // Opened in a new tab, the page has no history to return to.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push(fallback));

  return goBack;
};
