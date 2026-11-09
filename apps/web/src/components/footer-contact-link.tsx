import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContactHref } from "@/lib/contact-hrefs";

export async function FooterContactLink({ href }: { href: ContactHref | "/contact" }) {
  const t = await getTranslations("shell");

  return (
    <Link href={href} scroll={false} className="transition-colors hover:text-foreground">
      {t("contact")}
    </Link>
  );
}
