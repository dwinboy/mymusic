import { Suspense } from "react";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
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

export default async function HomePage() {
  // Prefer an editorially featured release, but fall back to the newest one:
  // un-featuring everything shouldn't blank the homepage for every listener.
  const heroTrack =
    (await db.track.findFirst({
      where: { isPublished: true, processingStatus: "READY", isFeatured: true },
      orderBy: { releaseDate: "desc" },
      include: { artist: true, album: true },
    })) ??
    (await db.track.findFirst({
      where: { isPublished: true, processingStatus: "READY" },
      orderBy: { createdAt: "desc" },
      include: { artist: true, album: true },
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

  const player = toPlayerTrack(heroTrack, "hero");

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-12 px-4 py-6 sm:px-8 sm:py-8">
      <Hero
        track={player}
        description={heroTrack.description ?? `The latest from ${player.artistName}.`}
        albumHref={player.albumSlug ? `/album/${player.albumSlug}` : undefined}
      />

      <Suspense fallback={<RailSkeleton />}>
        <QuickIntents />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <ContinueListeningSection />
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
