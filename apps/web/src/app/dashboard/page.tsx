import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My account | Local Craftsmen" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { name, email, role } = user;

  return (
    <div className="px-5 sm:px-8">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 py-12 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {role === "craftsman" ? "Craftsman account" : "Customer account"}
            </p>
            <h1 className="text-3xl font-medium tracking-tight">Welcome, {name}</h1>
            <p className="text-muted-foreground">{email}</p>
          </div>
          <SignOutButton />
        </div>
        <p className="max-w-xl text-muted-foreground">
          {role === "craftsman"
            ? "Your account is ready. Profile, availability, and booking management are coming next."
            : "Your account is ready. You can browse the directory while booking is being added."}
        </p>
        <Link href="/" className="w-fit text-sm font-medium underline underline-offset-4">
          Browse craftsmen
        </Link>
      </main>
    </div>
  );
}
