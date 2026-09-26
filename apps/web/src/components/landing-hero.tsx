import { userRoleSchema } from "@local-craftsmen/contracts";
import { getTranslations } from "next-intl/server";
import { PhotoHero } from "@/components/photo-hero";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function LandingHero() {
  const t = await getTranslations("home");

  return (
    <PhotoHero className="lg:pb-0" heading={t.rich("heading", { br: () => <br /> })}>
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
    </PhotoHero>
  );
}
