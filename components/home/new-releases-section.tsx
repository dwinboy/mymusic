import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";

export async function NewReleasesSection() {
  const tracks = await db.track.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { artist: true, album: true },
  });

  if (tracks.length === 0) return null;

  const playerTracks = tracks.map((t) => toPlayerTrack(t));

  return (
    <section>
      <SectionHeader title="New Releases" subtitle="Freshly published to the catalogue" href="/new-releases" />
      <HorizontalScroller>
        {playerTracks.map((track) => (
          <MusicCard key={track.id} track={track} queue={playerTracks} />
        ))}
      </HorizontalScroller>
    </section>
  );
}
