import { SessionNavigation, SiteHeader } from "@/components/site-header";

/** Pages any visitor can reach; the header reads the session to show the right account side. */
export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader account={<SessionNavigation />} />
      {children}
    </>
  );
}
