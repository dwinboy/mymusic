"use client";

import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { PlayerTrack } from "@/lib/types";

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ShufflePlayButton({ tracks }: { tracks: PlayerTrack[] }) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  function handleClick() {
    playQueue(shuffleArray(tracks), 0);
    if (!shuffle) toggleShuffle();
  }

  return (
    <Button variant="secondary" size="icon-lg" aria-label="Shuffle play" onClick={handleClick} disabled={tracks.length === 0}>
      <Shuffle className="h-5 w-5" />
    </Button>
  );
}
