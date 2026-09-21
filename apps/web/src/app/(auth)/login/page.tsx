import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in | Local Craftsmen" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Welcome back</h1>
      <p className="mt-3 mb-8 text-muted-foreground">Sign in to your Local Craftsmen account.</p>
      <AuthForm mode="login" />
    </>
  );
}
