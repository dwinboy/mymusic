"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LyricsPanel } from "@/components/player/lyrics-panel";
import { usePlayerStore } from "@/lib/stores/player-store";

/**
 * Lyrics for desktop, where there is no full-screen player to hold them.
 * Same panel as the phone, so timed lyrics follow the song here too — and,
 * as there, it carries its own close button: this sheet had none, leaving
 * the overlay strip above it or the Escape key as the only ways out.
 */
export function LyricsSheet() {
  const isOpen = usePlayerStore((s) => s.isLyricsOpen);
  const setLyricsOpen = usePlayerStore((s) => s.setLyricsOpen);
  const track = usePlayerStore((s) => s.currentTrack());

  if (!track?.lyrics?.trim()) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setLyricsOpen}>
      <SheetContent
        className="mx-auto flex h-[80dvh] max-w-md flex-col p-5"
        // Lines are buttons so they can be tapped to seek, which means the
        // first one would take focus on open and sit there wearing a focus
        // ring as though it were the line playing.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <LyricsPanel track={track} onClose={() => setLyricsOpen(false)} className="flex-1" />
      </SheetContent>
    </Sheet>
  );
}
