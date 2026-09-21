import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account | Local Craftsmen" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Create your account</h1>
      <p className="mt-3 mb-8 text-muted-foreground">Find local help or offer your skills.</p>
      <AuthForm mode="register" />
    </>
  );
}
