import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

async function AccountNavigation() {
  const user = await getCurrentUser().catch(() => null);

  return user ? (
    <Link href="/dashboard" className="text-sm underline-offset-4 hover:underline">
      My account
    </Link>
  ) : (
    <nav aria-label="Account" className="flex items-center gap-5 text-sm">
      <Link href="/login" className="underline-offset-4 hover:underline">
        Sign in
      </Link>
      <Link href="/register" className="font-medium underline-offset-4 hover:underline">
        Create account
      </Link>
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex min-h-20 w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-border border-b py-4">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        LOCAL / CRAFT
      </Link>
      <Suspense
        fallback={
          <Link href="/dashboard" className="text-sm">
            My account
          </Link>
        }
      >
        <AccountNavigation />
      </Suspense>
    </header>
  );
}
