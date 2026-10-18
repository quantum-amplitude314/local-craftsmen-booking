export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space">
      <div className="mx-auto w-full min-w-0 max-w-md">{children}</div>
    </main>
  );
}
