import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in | Local Craftsmen" };

export default function LoginPage() {
  return (
    <>
      <h1 className="page-heading">Welcome back</h1>
      <p className="body-lead mt-4 mb-10 text-muted-foreground">
        Sign in to your Local Craftsmen account.
      </p>
      <AuthForm mode="login" />
    </>
  );
}
