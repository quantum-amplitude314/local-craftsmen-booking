"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="page-shell section-space flex flex-col items-start gap-6"
    >
      <h1 className="page-heading max-w-2xl">Your account is temporarily unavailable</h1>
      <p className="body-lead text-muted-foreground">
        We couldn’t load your account. Please try again.
      </p>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
}
