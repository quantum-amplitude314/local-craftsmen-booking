import Link from "next/link";
import { Suspense } from "react";
import { PaletteToggle } from "@/components/palette-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

async function AccountNavigation() {
  const user = await getCurrentUser().catch(() => null);

  return user ? (
    <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
      My account
    </Link>
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
        Sign in
      </Link>
      <Link href="/register" className={buttonVariants({ variant: "outline" })}>
        Create account
      </Link>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="page-shell flex min-h-24 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b py-5">
      <Link
        href="/"
        aria-label="Local Craftsmen home"
        className="text-sm font-semibold tracking-tight"
      >
        LOCAL <span className="px-1 text-primary">/</span> CRAFT
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Account">
          <Suspense
            fallback={
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                My account
              </Link>
            }
          >
            <AccountNavigation />
          </Suspense>
        </nav>
        <PaletteToggle />
      </div>
    </header>
  );
}
