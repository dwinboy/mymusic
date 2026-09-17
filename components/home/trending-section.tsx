import { auth } from "@/auth";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { trendingService } from "@/lib/trending";
import { SectionHeader } from "@/components/music/section-header";
import { TrackRow } from "@/components/music/track-row";

export async function TrendingSection() {
  // Recent momentum across listeners, not lifetime play count — a track that
  // peaked last year shouldn't sit at the top of "Trending" forever.
  const [trending, session] = await Promise.all([trendingService.tracks(10), auth()]);
  if (trending.tracks.length === 0) return null;

  const playerTracks = trending.tracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, playerTracks.map((t) => t.id));

  return (
    <section>
      <SectionHeader
        title={trending.organic ? "Trending Now" : "Handpicked for You"}
        subtitle={trending.organic ? "Gaining listeners this week" : "Featured and newly released"}
      />
      <div className="flex flex-col">
        {playerTracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} queue={playerTracks} initiallyLiked={liked.has(track.id)} />
        ))}
      </div>
    </section>
  );
}
