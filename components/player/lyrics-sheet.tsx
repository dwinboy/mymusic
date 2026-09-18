"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SyncedLyrics } from "@/components/player/synced-lyrics";
import { usePlayerStore } from "@/lib/stores/player-store";

/**
 * Lyrics for desktop, where there is no full-screen player to hold them.
 * Same view as the phone sheet, so timed lyrics follow the song here too.
 */
export function LyricsSheet() {
  const isOpen = usePlayerStore((s) => s.isLyricsOpen);
  const setLyricsOpen = usePlayerStore((s) => s.setLyricsOpen);
  const track = usePlayerStore((s) => s.currentTrack());

  if (!track?.lyrics?.trim()) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setLyricsOpen}>
      <SheetContent
        className="mx-auto flex max-w-md flex-col p-5"
        // Lines are buttons so they can be tapped to seek, which means the
        // first one would take focus on open and sit there wearing a focus
        // ring as though it were the line playing.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <h2 className="mb-1 text-base font-semibold text-foreground">{track.title}</h2>
        <p className="mb-4 text-sm text-foreground-muted">{track.artistName}</p>
        <div className="-mx-2 flex-1 overflow-y-auto px-2">
          <SyncedLyrics lyrics={track.lyrics} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
