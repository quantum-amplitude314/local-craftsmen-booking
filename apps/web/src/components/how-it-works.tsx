import { getTranslations } from "next-intl/server";

export async function HowItWorks() {
  const t = await getTranslations("home");

  const steps = [
    {
      key: "createAccount",
      title: t("howItWorks.createAccount.title"),
      lines: [t("howItWorks.createAccount.description")],
    },
    {
      key: "order",
      title: t("howItWorks.order.title"),
      lines: [t("howItWorks.order.customer"), t("howItWorks.order.craftsman")],
    },
    {
      key: "manage",
      title: t("howItWorks.manage.title"),
      lines: [t("howItWorks.manage.description")],
    },
  ];

  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="border-t pt-8 pb-(--section-space) lg:border-t-0"
    >
      <h2 id="how-it-works-heading" className="section-heading">
        {t("howItWorks.heading")}
      </h2>
      <ol className="grid gap-x-8 md:grid-cols-3">
        {steps.map(({ key, title, lines }, index) => (
          <li key={key} className="flex min-w-0 flex-col gap-3 py-8 max-md:not-first:border-t">
            <p className="eyebrow text-primary">{t("howItWorks.step", { number: index + 1 })}</p>
            <h3 className="subsection-heading">{title}</h3>
            {lines.map((line) => (
              <p key={line} className="prose-text text-base leading-[1.7] text-muted-foreground">
                {line}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
