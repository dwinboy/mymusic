import { auth } from "@/auth";
import { toPlayerTrack } from "@/lib/mappers";
import { recommendationService } from "@/lib/recommendations";
import { termHref } from "@/lib/taxonomy";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";

/** Only appears once a listener's history says something; never a guess. */
export async function MadeForYouSection() {
  const session = await auth();
  if (!session?.user) return null;

  const result = await recommendationService.becauseYouListen(session.user.id);
  if (!result) return null;

  const tracks = result.tracks.map((t) => toPlayerTrack(t));

  return (
    <section>
      <SectionHeader
        title={`Because You Listen to ${result.genreName}`}
        subtitle="More from the sound you keep coming back to"
        href={termHref("GENRE", result.genreSlug)!}
      />
      <HorizontalScroller>
        {tracks.map((track) => (
          <MusicCard key={track.id} track={track} queue={tracks} />
        ))}
      </HorizontalScroller>
    </section>
  );
}
