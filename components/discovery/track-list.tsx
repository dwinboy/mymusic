"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackRow } from "@/components/music/track-row";
import type { PlayerTrack } from "@/lib/types";

/**
 * First page is server-rendered; further pages load on request through the
 * same filter query. Loaded tracks join the play queue, so pressing play on
 * row 40 continues into row 41.
 */
export function PaginatedTrackList({
  initialTracks,
  initialCursor,
  query,
  likedIds = [],
  pageSize = 24,
}: {
  initialTracks: PlayerTrack[];
  initialCursor: string | null;
  query: string;
  likedIds?: string[];
  pageSize?: number;
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const liked = new Set(likedIds);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams(query);
      params.set("cursor", cursor);
      params.set("limit", String(pageSize));
      const res = await fetch(`/api/tracks?${params}`);
      if (!res.ok) throw new Error();
      const data: { tracks: PlayerTrack[]; nextCursor: string | null } = await res.json();
      setTracks((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...data.tracks.filter((t) => !seen.has(t.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col">
        {tracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} queue={tracks} initiallyLiked={liked.has(track.id)} />
        ))}
      </div>

      {cursor && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </Button>
          {error && <p className="text-sm text-danger">Couldn&apos;t load more. Try again.</p>}
        </div>
      )}
    </div>
  );
}
