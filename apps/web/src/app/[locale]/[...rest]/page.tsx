import { notFound } from "next/navigation";

export const instant = false;

// Unmatched paths land here so the localized not-found page renders inside the site layout.
export default function UnmatchedPath() {
  notFound();
}
