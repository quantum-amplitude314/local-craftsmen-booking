import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account | Local Craftsmen" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="page-heading">Create your account</h1>
      <p className="body-lead mt-4 mb-10 text-muted-foreground">
        Find local help or offer your skills.
      </p>
      <AuthForm mode="register" />
    </>
  );
}
