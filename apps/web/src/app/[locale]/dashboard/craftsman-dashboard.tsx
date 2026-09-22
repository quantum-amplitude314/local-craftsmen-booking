import { getTranslations } from "next-intl/server";

export async function CraftsmanDashboard() {
  const t = await getTranslations("dashboard");

  return <p className="body-lead max-w-xl text-muted-foreground">{t("ready.craftsman")}</p>;
}
