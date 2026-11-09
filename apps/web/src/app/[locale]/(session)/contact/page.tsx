import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ContactFormSkeleton } from "@/components/contact-form";
import { SectionError } from "@/components/section-error";
import { SenderContactForm } from "@/components/sender-contact-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("contact");
  const metadata = { title: t("title") };

  return metadata;
};

export default function ContactPage() {
  return (
    <main id="main-content" tabIndex={-1} className="page-shell section-space">
      <div className="mx-auto w-full min-w-0 max-w-md">
        <SectionError>
          <Suspense fallback={<ContactFormSkeleton />}>
            <SenderContactForm />
          </Suspense>
        </SectionError>
      </div>
    </main>
  );
}
