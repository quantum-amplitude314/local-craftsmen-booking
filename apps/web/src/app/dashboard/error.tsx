"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-5 py-20">
      <h1 className="text-2xl font-medium">Your account is temporarily unavailable</h1>
      <p className="text-muted-foreground">Check that the API is running and try again.</p>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
}
