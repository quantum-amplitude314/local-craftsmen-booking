import { userRoleSchema } from "@local-craftsmen/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

const HOW_IT_WORKS_STEPS = ["createAccount", "browse", "compareRates"] as const;

export default async function Home() {
  const [user, locale, t] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("home"),
  ]);
  if (user) return redirect({ href: "/dashboard", locale });

  return (
    <main id="main-content" tabIndex={-1} className="page-shell">
      <section className="section-space grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-12">
        <div>
          <p className="eyebrow mb-6 text-primary">{t("eyebrow")}</p>
          <h1 className="display-heading max-w-3xl">{t.rich("heading", { br: () => <br /> })}</h1>
        </div>
        <div className="flex max-w-md flex-col gap-8 lg:pb-1">
          <p className="body-lead text-muted-foreground">{t("description")}</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                {t("findCraftsman")}
              </Link>
              <Link
                href={{ pathname: "/register", query: { role: userRoleSchema.enum.craftsman } }}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {t("offerServices")}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.rich("signInPrompt", {
                link: (chunks) => (
                  <Link href="/login" className="font-medium text-foreground underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works-heading" className="pb-(--section-space)">
        <h2 id="how-it-works-heading" className="section-heading pb-5">
          {t("howItWorks.heading")}
        </h2>
        <ol className="grid gap-x-8 border-t md:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <li key={step} className="flex min-w-0 flex-col gap-3 border-b py-8">
              <p className="eyebrow text-primary">{t("howItWorks.step", { number: index + 1 })}</p>
              <h3 className="font-medium">{t(`howItWorks.${step}.title`)}</h3>
              <p className="prose-text text-sm leading-6 text-muted-foreground">
                {t(`howItWorks.${step}.description`)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
