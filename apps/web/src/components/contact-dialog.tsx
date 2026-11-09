"use client";

import { cn } from "cn";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, type ReactNode, use } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link, useRouter } from "@/i18n/navigation";
import type { ContactHref } from "@/lib/contact-hrefs";

const ContactCloseContext = createContext<ContactHref | null>(null);

export const useContactCloseHref = () => use(ContactCloseContext);

export function ContactDialog({
  closeHref,
  children,
}: {
  closeHref: ContactHref;
  children: ReactNode;
}) {
  const t = useTranslations("contact");
  const router = useRouter();
  const closeOnEscOrOutsideClick = (open: boolean) => {
    if (!open) router.push(closeHref, { scroll: false });
  };

  return (
    <ContactCloseContext value={closeHref}>
      <Dialog open onOpenChange={closeOnEscOrOutsideClick}>
        <DialogContent showCloseButton={false}>
          {children}
          <Link
            href={closeHref}
            scroll={false}
            aria-label={t("close")}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "absolute top-4 right-4",
            )}
          >
            <XIcon aria-hidden="true" />
          </Link>
        </DialogContent>
      </Dialog>
    </ContactCloseContext>
  );
}
