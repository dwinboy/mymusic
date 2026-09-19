"use client";

import { usePlayerStore } from "@/lib/stores/player-store";
import { Header } from "@/components/layout/header";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PlayerShell } from "@/components/player/player-shell";
import { InstallNudge } from "@/components/pwa/install-nudge";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hasTrack = usePlayerStore((s) => !!s.currentTrack());

  return (
    <div className="flex min-h-dvh flex-col">
      {/* First stop for a keyboard or screen reader, so the whole header and
          navigation can be stepped over on every page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <Header />
      <MobileHeader />
      <main
        id="main"
        tabIndex={-1}
        className={cn(
          "flex-1",
          // Mobile: bottom nav (64px) + safe area, plus mini-player (64px) when a track is loaded.
          hasTrack ? "pb-[calc(128px+env(safe-area-inset-bottom,0px))]" : "pb-[calc(64px+env(safe-area-inset-bottom,0px))]",
          // Desktop (lg and up, where the desktop chrome starts): player bar 80px.
          hasTrack ? "lg:pb-20" : "lg:pb-0"
        )}
      >
        {children}
      </main>
      <BottomNav />
      <PlayerShell />
      <InstallNudge />
    </div>
  );
}
