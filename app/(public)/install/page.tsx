import type { Metadata } from "next";
import { InstallGuide } from "@/components/pwa/install-guide";

export const metadata: Metadata = {
  title: "Get the app",
  description:
    "Install Vibe Banger on your phone or computer: full screen, lock-screen controls, and downloads that play with no connection. No App Store needed.",
  alternates: { canonical: "/install" },
};

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Vibe Banger</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Get the app</h1>
      <p className="mt-3 max-w-prose text-base text-foreground-muted">
        Vibe Banger installs straight from this page — no store, no account needed, and it keeps working in your
        browser either way.
      </p>

      <div className="mt-10">
        <InstallGuide />
      </div>
    </div>
  );
}
