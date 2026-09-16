import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";

export async function ContinueListeningSection() {
  const session = await auth();
  if (!session?.user) return null;

  const history = await db.listeningHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { playedAt: "desc" },
    take: 12,
    distinct: ["trackId"],
    include: { track: { include: { artist: true, album: true } } },
  });

  if (history.length === 0) return null;

  const playerTracks = history.map((h) => toPlayerTrack(h.track));

  return (
    <section>
      <SectionHeader title="Continue Listening" />
      <HorizontalScroller>
        {playerTracks.map((track) => (
          <MusicCard key={track.id} track={track} queue={playerTracks} />
        ))}
      </HorizontalScroller>
    </section>
  );
}
