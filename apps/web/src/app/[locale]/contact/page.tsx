import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/contact-form";
import { getCurrentUser } from "@/lib/auth";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("contact");
  const metadata = { title: t("title") };

  return metadata;
};

export default async function ContactPage() {
  const user = await getCurrentUser();
  const sender = user && { name: user.name, email: user.email };

  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space">
      <div className="mx-auto w-full min-w-0 max-w-md">
        <ContactForm sender={sender} />
      </div>
    </main>
  );
}
