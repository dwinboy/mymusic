"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

const CHECK_EVERY_MS = 30 * 60 * 1000;
const MIN_GAP_MS = 5 * 60 * 1000;

/**
 * Tells someone with the app open — especially the installed app, which can
 * stay open for days — that a newer version is live. Checked when the app
 * comes back to the foreground or reconnects, and every half hour.
 *
 * Only ever reloads when asked.
 */
export function UpdateBanner({ buildId }: { buildId: string }) {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (buildId === "development" || window.self !== window.top) return;

    async function check() {
      if (Date.now() - lastCheck.current < MIN_GAP_MS || !navigator.onLine) return;
      lastCheck.current = Date.now();
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { buildId: live } = await res.json();
        if (live && live !== "development" && live !== buildId) setAvailable(true);
      } catch {
        // Offline or a blip; the next check will catch it.
      }
    }

    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    const timer = setInterval(check, CHECK_EVERY_MS);
    lastCheck.current = Date.now(); // the page was just loaded from this build
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
      clearInterval(timer);
    };
  }, [buildId]);

  // Deliberately not hidden while a track is playing. This is a music app:
  // something is playing most of the time, so that condition meant a listener
  // in the installed app was never told an update existed and could sit on a
  // build from days ago. It is a small pill under the header — it interrupts
  // nothing, and refreshing stays their choice. The player restores what was
  // playing after a reload.
  if (!available || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 z-50 flex justify-center px-3"
      // Just below the header, so it doesn't cover navigation.
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 76px)" }}
    >
      <div className="flex animate-scale-in items-center gap-2 rounded-full border border-border-strong bg-canvas-raised/95 py-1.5 pl-4 pr-1.5 shadow-elevated backdrop-blur-xl">
        <span className="text-sm text-foreground">A new version is ready</span>
        <button
          onClick={() => window.location.reload()}
          className="flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Later"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-subtle transition-colors hover:bg-surface hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
