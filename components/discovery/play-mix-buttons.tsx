"use client";

import { useState } from "react";
import { Play, Shuffle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useToast } from "@/hooks/use-toast";
import type { PlayerTrack } from "@/lib/types";

/** Enough for a real listening session without fetching an unbounded mix. */
const MIX_SIZE = 50;

/**
 * "Play Sleep" / "Shuffle". The queue is built on demand from the same filter
 * query the page shows — a mix is a view over the catalogue, never a stored
 * copy of tracks.
 */
export function PlayMixButtons({ query, label }: { query: string; label: string }) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const { toast } = useToast();
  const [loading, setLoading] = useState<"play" | "shuffle" | null>(null);

  async function start(mode: "play" | "shuffle") {
    setLoading(mode);
    try {
      const params = new URLSearchParams(query);
      params.set("limit", String(MIX_SIZE));
      const res = await fetch(`/api/tracks?${params}`);
      const data: { tracks?: PlayerTrack[] } = await res.json();
      const tracks = data.tracks ?? [];

      if (tracks.length === 0) {
        toast({ title: "Nothing to play yet", description: "No tracks match this selection." });
        return;
      }

      if (mode === "shuffle") {
        // Start somewhere random, then let the store shuffle the rest — so
        // the shuffle control reflects it and can restore the original order.
        playQueue(tracks, Math.floor(Math.random() * tracks.length));
        toggleShuffle();
      } else {
        playQueue(tracks, 0);
      }
    } catch {
      toast({ title: "Couldn't start playback", description: "Check your connection and try again." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="lg" onClick={() => start("play")} disabled={loading !== null}>
        {loading === "play" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="currentColor" />}
        Play {label}
      </Button>
      <Button size="lg" variant="secondary" onClick={() => start("shuffle")} disabled={loading !== null}>
        {loading === "shuffle" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
        Shuffle
      </Button>
    </div>
  );
}
