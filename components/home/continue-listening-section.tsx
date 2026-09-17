import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";

export async function ContinueListeningSection() {
  const session = await auth();
  if (!session?.user) return null;

  const recent = await db.listeningHistory.findMany({
    // A track unpublished since it was heard would sit here and fail to play.
    where: { userId: session.user.id, track: { isPublished: true, processingStatus: "READY" } },
    orderBy: { playedAt: "desc" },
    // Deduplicated below rather than with Prisma `distinct`, which applies
    // after `take`: someone who looped one song would otherwise get a single
    // card instead of a row.
    take: 60,
    select: { trackId: true },
  });

  const trackIds = [...new Set(recent.map((h) => h.trackId))].slice(0, 12);
  if (trackIds.length === 0) return null;

  const rows = await db.track.findMany({ where: { id: { in: trackIds } }, include: { artist: true, album: true } });
  const byId = new Map(rows.map((t) => [t.id, t]));
  const playerTracks = trackIds
    .map((id) => byId.get(id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => toPlayerTrack(t));

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
