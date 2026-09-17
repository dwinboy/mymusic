"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IosInstallSteps } from "@/components/pwa/ios-install-steps";
import { dismissInstall, isInstallDismissed, useInstallAvailability } from "@/hooks/use-install-availability";

/** The install card in Library: a permanent, low-key place to find it. */
export function InstallPrompt() {
  const { method, promptInstall } = useInstallAvailability();
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && isInstallDismissed());

  if (!method || dismissed) return null;

  function dismiss() {
    dismissInstall();
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Download className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Install Vibe Banger</p>
        <p className="text-xs text-foreground-muted">Full-screen app, lock-screen controls and offline downloads.</p>
        {method === "ios" && (
          <div className="mt-3">
            <IosInstallSteps />
          </div>
        )}
      </div>
      {method === "prompt" && (
        <Button
          size="sm"
          onClick={async () => {
            await promptInstall();
            dismiss();
          }}
        >
          Install
        </Button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
