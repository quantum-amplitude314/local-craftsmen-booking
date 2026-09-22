export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="page-shell section-space grid gap-12 lg:grid-cols-2 lg:gap-16"
    >
      <aside className="hidden flex-col items-start gap-6 lg:flex">
        <p className="eyebrow text-primary">Local skills. Real connections.</p>
        <p className="page-heading max-w-md">Good work starts close to home.</p>
        <p className="body-lead max-w-sm text-muted-foreground">
          A place for people who need a hand and craftspeople who know their trade.
        </p>
      </aside>
      <div className="mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:max-w-none lg:border-l lg:pl-16">
        {children}
      </div>
    </main>
  );
}
