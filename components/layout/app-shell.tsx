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
      <Header />
      <MobileHeader />
      <main
        className={cn(
          "flex-1",
          // Mobile: bottom nav (64px) + safe area, plus mini-player (64px) when a track is loaded.
          hasTrack ? "pb-[calc(128px+env(safe-area-inset-bottom,0px))]" : "pb-[calc(64px+env(safe-area-inset-bottom,0px))]",
          // Desktop: persistent player bar (80px) when a track is loaded.
          hasTrack ? "md:pb-20" : "md:pb-0"
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
