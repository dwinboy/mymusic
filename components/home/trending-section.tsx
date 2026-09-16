import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { SectionHeader } from "@/components/music/section-header";
import { TrackRow } from "@/components/music/track-row";

export async function TrendingSection() {
  const [tracks, session] = await Promise.all([
    db.track.findMany({
      where: { isPublished: true },
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { artist: true, album: true },
    }),
    auth(),
  ]);

  if (tracks.length === 0) return null;

  const playerTracks = tracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, playerTracks.map((t) => t.id));

  return (
    <section>
      <SectionHeader title="Popular Right Now" subtitle="Trending across the catalogue" />
      <div className="flex flex-col">
        {playerTracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            queue={playerTracks}
            initiallyLiked={liked.has(track.id)}
          />
        ))}
      </div>
    </section>
  );
}
