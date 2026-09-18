"use client";

import { usePlayerStore } from "@/lib/stores/player-store";
import { DesktopPlayer } from "@/components/player/desktop-player";
import { MobileMiniPlayer } from "@/components/player/mobile-mini-player";
import { NowPlayingSheet } from "@/components/player/now-playing-sheet";
import { QueueSheet } from "@/components/player/queue-sheet";
import { LyricsSheet } from "@/components/player/lyrics-sheet";
import { PlayerError } from "@/components/player/player-error";
import { RadioAutofill } from "@/components/player/radio-autofill";
import { KeyboardShortcuts } from "@/components/player/keyboard-shortcuts";

export function PlayerShell() {
  const hasTrack = usePlayerStore((s) => !!s.currentTrack());

  return (
    <>
      <PlayerError />
      <RadioAutofill />
      <KeyboardShortcuts />
      {hasTrack && (
        <div className="fixed inset-x-0 bottom-0 z-30 hidden md:block" style={{ viewTransitionName: "player-bar" }}>
          <DesktopPlayer />
        </div>
      )}
      <MobileMiniPlayer />
      <NowPlayingSheet />
      <QueueSheet />
      <LyricsSheet />
    </>
  );
}
