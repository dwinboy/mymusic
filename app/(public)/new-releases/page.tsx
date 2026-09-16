import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { TrackRow } from "@/components/music/track-row";
import { EmptyState } from "@/components/states/empty-state";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "New Releases",
  description: "The latest tracks published on Lumen.",
};

export default async function NewReleasesPage() {
  const [tracks, session] = await Promise.all([
    db.track.findMany({
      where: { isPublished: true },
      orderBy: { releaseDate: "desc" },
      take: 50,
      include: { artist: true, album: true },
    }),
    auth(),
  ]);

  const playerTracks = tracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, playerTracks.map((t) => t.id));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">New Releases</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Fresh on Lumen</h1>

      {playerTracks.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nothing published yet" className="mt-10" />
      ) : (
        <div className="mt-8 flex flex-col">
          {playerTracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} queue={playerTracks} initiallyLiked={liked.has(track.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
