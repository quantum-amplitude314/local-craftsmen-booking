import { SiteHeader } from "@/components/site-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 sm:px-8">
      <SiteHeader />
      <main className="mx-auto max-w-md py-12 sm:py-20">{children}</main>
    </div>
  );
}
