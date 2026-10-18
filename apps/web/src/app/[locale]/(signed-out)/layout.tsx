import { SignedOutNavigation, SiteHeader } from "@/components/site-header";

/** Pages the proxy keeps from signed-in visitors, so the header reads no session and they prerender. */
export default function SignedOutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader account={<SignedOutNavigation />} />
      {children}
    </>
  );
}
