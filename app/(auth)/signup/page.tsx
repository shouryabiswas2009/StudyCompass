import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <LogoMark size={40} className="text-primary" />
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          It only takes a minute — you&apos;ll build your profile next.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
