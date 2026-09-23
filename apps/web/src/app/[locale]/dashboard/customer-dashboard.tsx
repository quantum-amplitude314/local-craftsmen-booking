import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function CustomerDashboard() {
  const t = await getTranslations("dashboard");

  return (
    <>
      <p className="body-lead max-w-xl text-muted-foreground">{t("ready.customer")}</p>
      <div>
        <Link href="/slots" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t("browse")}
        </Link>
      </div>
    </>
  );
}
