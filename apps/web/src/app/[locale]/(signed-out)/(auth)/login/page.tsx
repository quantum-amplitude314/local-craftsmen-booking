import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("login");
  const metadata = { title: t("title"), description: t("description") };

  return metadata;
};

export default async function LoginPage() {
  const t = await getTranslations("login");

  return (
    <>
      <h1 className="page-heading">{t("heading")}</h1>
      <p className="body-lead mt-4 mb-10 text-muted-foreground">{t("description")}</p>
      <AuthForm mode="login" />
    </>
  );
}
