import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Save music, build playlists, and pick up where you left off."
      footer={
        <>
          Already have an account?{" "}
          <AuthSwitchLink href="/login">Log in</AuthSwitchLink>
        </>
      }
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
