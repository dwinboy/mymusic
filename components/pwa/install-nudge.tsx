"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IosInstallSteps } from "@/components/pwa/ios-install-steps";
import { dismissInstall, isInstallDismissed, useInstallAvailability } from "@/hooks/use-install-availability";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";

/** Listening this long in one visit means they like it here; asking earlier is noise. */
const LISTENED_BEFORE_ASKING_SECONDS = 30;

/**
 * Or this many pages, for someone who is reading rather than playing.
 *
 * Playback alone was the only trigger, which meant a visitor who browsed the
 * catalogue for ten minutes without pressing play was never told the app
 * existed — and on iPhone, where there is no install button in the browser
 * chrome either, that was every entry point gone but the Library page. Four
 * is high enough that a shared link opened once and closed never reaches it.
 */
const PAGES_BEFORE_ASKING = 4;
const PAGES_KEY = "vibebanger:pages-this-visit";

function countPage(): number {
  try {
    const next = Number(sessionStorage.getItem(PAGES_KEY) ?? "0") + 1;
    sessionStorage.setItem(PAGES_KEY, String(next));
    return next;
  } catch {
    // Private mode: fall back to playback as the only trigger.
    return 0;
  }
}

/**
 * A one-off install suggestion that appears only after someone has been
 * listening for a while — never on arrival from a shared link, when they
 * haven't heard anything yet. Dismissing it quiets it for 30 days.
 */
export function InstallNudge() {
  const { method, promptInstall } = useInstallAvailability();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const hasTrack = usePlayerStore((s) => !!s.currentTrack());
  const pathname = usePathname();
  const [state, setState] = useState<"waiting" | "shown" | "closed">("waiting");
  // Counted across tracks: many songs here are shorter clips, so time within
  // a single track isn't a reliable signal.
  const listened = useRef(0);

  useEffect(() => {
    if (state !== "waiting" || !isPlaying || !method) return;
    const timer = setInterval(() => {
      listened.current += 1;
      if (listened.current >= LISTENED_BEFORE_ASKING_SECONDS) {
        clearInterval(timer);
        setState(isInstallDismissed() ? "closed" : "shown");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state, isPlaying, method]);

  // The other way in: enough pages to show they're actually looking around.
  // Never on the install page itself, which is already the answer.
  useEffect(() => {
    if (state !== "waiting" || !method || pathname === "/install") return;
    if (countPage() < PAGES_BEFORE_ASKING) return;
    // After the page has settled rather than the moment it lands — arriving
    // on top of a screen that is still drawing reads as an interruption.
    const timer = setTimeout(() => setState(isInstallDismissed() ? "closed" : "shown"), 1500);
    return () => clearTimeout(timer);
  }, [state, method, pathname]);

  if (state !== "shown" || !method) return null;

  function close() {
    dismissInstall();
    setState("closed");
  }

  return (
    <div
      role="dialog"
      aria-label="Install Vibe Banger"
      className={cn(
        "fixed inset-x-3 z-40 animate-scale-in rounded-2xl border border-border-strong bg-canvas-raised/95 p-4 shadow-elevated backdrop-blur-xl",
        "md:inset-x-auto md:right-6 md:w-96",
        // Above the bottom nav and mini player on phones, above the player bar on desktop.
        hasTrack ? "bottom-[calc(140px+env(safe-area-inset-bottom,0px))] md:bottom-24" : "bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-6"
      )}
    >
      <div className="flex items-start gap-3">
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Get the Vibe Banger app</p>
          <p className="mt-0.5 text-sm text-foreground-muted">Full screen, lock-screen controls and downloads that play offline.</p>
        </div>
        <button
          onClick={close}
          aria-label="Not now"
          className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground-subtle transition-colors hover:bg-surface hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {method === "ios" ? (
        <div className="mt-4 flex items-end justify-between gap-3">
          <IosInstallSteps />
          <Button size="sm" variant="secondary" onClick={close} className="h-9 shrink-0 px-4">
            Got it
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            onClick={async () => {
              await promptInstall();
              close();
            }}
          >
            Install
          </Button>
          <Button variant="ghost" onClick={close}>
            Not now
          </Button>
        </div>
      )}
    </div>
  );
}
