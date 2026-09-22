import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { SignOutButton } from "@/components/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My account | Local Craftsmen" };

export default async function DashboardPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) return redirect({ href: "/login", locale });
  const { name, email, role } = user;

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="eyebrow text-primary">
            {role === "craftsman" ? "Craftsman account" : "Customer account"}
          </p>
          <h1 className="page-heading wrap-anywhere">Welcome, {name}</h1>
          <p className="wrap-anywhere text-muted-foreground">{email}</p>
        </div>
        <SignOutButton />
      </div>
      <p className="body-lead max-w-xl text-muted-foreground">
        {role === "craftsman"
          ? "Your account is ready. Profile, availability, and booking management are coming next."
          : "Your account is ready. You can browse the directory while booking is being added."}
      </p>
      <div>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Browse craftsmen
        </Link>
      </div>
    </main>
  );
}
