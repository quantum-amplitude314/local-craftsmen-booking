import { Suspense } from "react";
import { ContactDialog } from "@/components/contact-dialog";
import { ContactFormSkeleton } from "@/components/contact-form";
import { FooterContactLink } from "@/components/footer-contact-link";
import { SectionError } from "@/components/section-error";
import { SenderContactForm } from "@/components/sender-contact-form";
import { contactHrefsFor, type PageQuery } from "@/lib/contact-hrefs";

type ContactSlotProps = {
  params: Promise<{ rest?: string[] }>;
  searchParams: Promise<PageQuery>;
};

export default function ContactSlot({ params, searchParams }: ContactSlotProps) {
  return (
    <Suspense fallback={<FooterContactLink href="/contact" />}>
      <ContactForCurrentUrl params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactForCurrentUrl({ params, searchParams }: ContactSlotProps) {
  const [{ rest = [] }, query] = await Promise.all([params, searchParams]);
  const { isOpen, open, close } = contactHrefsFor({ rest, query });

  return (
    <>
      <FooterContactLink href={open} />
      {isOpen ? (
        <ContactDialog closeHref={close}>
          <SectionError>
            <Suspense fallback={<ContactFormSkeleton />}>
              <SenderContactForm />
            </Suspense>
          </SectionError>
        </ContactDialog>
      ) : null}
    </>
  );
}
