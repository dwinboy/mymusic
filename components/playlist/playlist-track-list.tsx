"use client";

import { useState } from "react";
import { TrackRow } from "@/components/music/track-row";
import type { PlayerTrack } from "@/lib/types";

export function PlaylistTrackList({
  tracks,
  likedIds,
  playlistId,
  isOwner,
}: {
  tracks: PlayerTrack[];
  likedIds: string[];
  playlistId: string;
  isOwner: boolean;
}) {
  const [list, setList] = useState(tracks);
  const liked = new Set(likedIds);

  return (
    <div className="flex flex-col">
      {list.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          index={i}
          queue={list}
          initiallyLiked={liked.has(track.id)}
          removeFromPlaylistId={isOwner ? playlistId : undefined}
          onRemovedFromPlaylist={
            isOwner ? () => setList((prev) => prev.filter((t) => t.id !== track.id)) : undefined
          }
        />
      ))}
    </div>
  );
}
