import { userRoleSchema } from "@local-craftsmen/contracts";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("register");
  const metadata = { title: t("title"), description: t("description") };

  return metadata;
};

export default async function RegisterPage({ searchParams }: PageProps<"/[locale]/register">) {
  const [t, { role }] = await Promise.all([getTranslations("register"), searchParams]);
  const requestedRole = userRoleSchema.safeParse(role);
  const initialRole = requestedRole.success ? requestedRole.data : userRoleSchema.enum.customer;

  return (
    <>
      <h1 className="page-heading">{t("heading")}</h1>
      <p className="body-lead mt-4 mb-10 text-muted-foreground">{t("description")}</p>
      <AuthForm mode="register" initialRole={initialRole} />
    </>
  );
}
