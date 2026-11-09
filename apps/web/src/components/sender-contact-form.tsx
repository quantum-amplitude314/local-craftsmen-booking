import { ContactForm } from "@/components/contact-form";
import { getCurrentUser } from "@/lib/auth";

export async function SenderContactForm() {
  const user = await getCurrentUser();
  const sender = user && { name: user.name, email: user.email };

  return <ContactForm sender={sender} />;
}
