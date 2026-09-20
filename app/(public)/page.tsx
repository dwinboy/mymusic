import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { formatDuration, formatReleaseDate } from "@/lib/utils";
import { Hero } from "@/components/home/hero";
import { ContinueListeningSection } from "@/components/home/continue-listening-section";
import { MadeForYouSection } from "@/components/home/made-for-you-section";
import { NewReleasesSection } from "@/components/home/new-releases-section";
import { FeaturedArtistsSection } from "@/components/home/featured-artists-section";
import { TrendingSection } from "@/components/home/trending-section";
import { GenresSection } from "@/components/home/genres-section";
import { QuickIntents } from "@/components/discovery/quick-intents";
import { TermRail } from "@/components/discovery/term-rail";
import { RailSkeleton, TrackRowSkeleton } from "@/components/states/skeletons";
import { EmptyState } from "@/components/states/empty-state";
import { Music2 } from "lucide-react";

// Rendered per request so newly published tracks appear without a redeploy.
export const dynamic = "force-dynamic";

/**
 * What the hero slot shows. A listener who has heard something gets their own
 * music back — the most premium thing the page can say is "carry on where you
 * were". Everyone else gets the editorial feature, which is what the slot is
 * for when there's nothing personal to show.
 */
async function resumeHero() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const last = await db.listeningHistory.findFirst({
    // A track unpublished since it was heard would sit here and fail to play.
    where: { userId: session.user.id, track: { isPublished: true, processingStatus: "READY" } },
    orderBy: { playedAt: "desc" },
    select: { progressSeconds: true, track: { include: { artist: true, album: true, terms: { select: { isPrimary: true, term: { select: { id: true, kind: true, name: true, slug: true } } } } } } },
  });
  if (!last) return null;

  // Only offer to resume from a genuine middle. Near the start there's nothing
  // to resume, and near the end it would drop someone into the fade-out.
  // Proportional rather than a fixed number of seconds, which would leave no
  // window at all on a short track and too wide a one on a long mix.
  const { progressSeconds, track } = last;
  const played = track.duration > 0 ? progressSeconds / track.duration : 0;
  const midway = played > 0.05 && played < 0.9;
  return { track, startAt: midway ? progressSeconds : 0, midway };
}

export default async function HomePage() {
  const resume = await resumeHero();

  // Prefer an editorially featured release, but fall back to the newest one:
  // un-featuring everything shouldn't blank the homepage for every listener.
  const heroTrack =
    (await db.track.findFirst({
      where: { isPublished: true, processingStatus: "READY", isFeatured: true },
      // Most recently featured first. Anything featured before the column
      // existed falls back to its release date rather than jumping to the end.
      orderBy: [{ featuredAt: { sort: "desc", nulls: "last" } }, { releaseDate: "desc" }],
      include: { artist: true, album: true, terms: { select: { isPrimary: true, term: { select: { id: true, kind: true, name: true, slug: true } } } } },
    })) ??
    (await db.track.findFirst({
      where: { isPublished: true, processingStatus: "READY" },
      orderBy: { createdAt: "desc" },
      include: { artist: true, album: true, terms: { select: { isPrimary: true, term: { select: { id: true, kind: true, name: true, slug: true } } } } },
    }));

  if (!heroTrack) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <EmptyState
          icon={Music2}
          title="The catalogue is warming up"
          description="New AI music will appear here as soon as creators publish it."
          actionLabel="Explore Discover"
          actionHref="/discover"
        />
      </div>
    );
  }

  const shown = resume?.track ?? heroTrack;
  const player = toPlayerTrack(shown, "hero");

  // What the track is, as routes into the catalogue. The hero had a short
  // sentence and half a screen of nothing beside it; these fill that with
  // somewhere to go rather than decoration.
  const KIND_ORDER = ["GENRE", "MOOD", "ACTIVITY", "OCCASION"] as const;
  const heroTerms = KIND_ORDER.flatMap((kind) => {
    const matching = shown.terms.filter((t) => t.term.kind === kind);
    const primary = matching.find((t) => t.isPrimary) ?? matching[0];
    return primary ? [primary.term] : [];
  }).slice(0, 4);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-12 px-4 py-6 sm:px-8 sm:py-8">
      <Hero
        track={player}
        eyebrow={resume ? (resume.midway ? "Pick up where you left off" : "Recently played") : "Featured Release"}
        startAt={resume?.startAt}
        description={shown.description ?? `The latest from ${player.artistName}.`}
        terms={heroTerms}
        meta={[
          ...(shown.releaseDate
            ? [{ label: "Released", value: formatReleaseDate(shown.releaseDate) }]
            : []),
          { label: "Length", value: formatDuration(shown.duration) },
          // How it was made isn't a reason to press play, so it doesn't sit
          // in the first thing anyone sees. It's on the song page, with the
          // rest of the detail, for anyone who wants to know.
        ]}
        albumHref={player.albumSlug ? `/album/${player.albumSlug}` : undefined}
      />

      <Suspense fallback={<RailSkeleton />}>
        <QuickIntents />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        {/* The hero already shows the newest one; repeating it as the first
            card in this row would read as a bug. */}
        <ContinueListeningSection excludeTrackId={resume?.track.id} />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <MadeForYouSection />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <NewReleasesSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
        }
      >
        <TrendingSection />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <GenresSection />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <TermRail kind="MOOD" title="Explore by Mood" subtitle="How you want to feel" />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <TermRail kind="ACTIVITY" title="Music for Every Moment" subtitle="What you're doing" />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <TermRail kind="OCCASION" title="Music for Your Occasion" subtitle="Where it's playing" size="lg" />
      </Suspense>

      <Suspense fallback={<RailSkeleton count={8} />}>
        <FeaturedArtistsSection />
      </Suspense>
    </div>
  );
}
