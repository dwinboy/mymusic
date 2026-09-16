import { Suspense } from "react";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { Hero } from "@/components/home/hero";
import { ContinueListeningSection } from "@/components/home/continue-listening-section";
import { NewReleasesSection } from "@/components/home/new-releases-section";
import { FeaturedArtistsSection } from "@/components/home/featured-artists-section";
import { TrendingSection } from "@/components/home/trending-section";
import { GenresSection } from "@/components/home/genres-section";
import { RailSkeleton, TrackRowSkeleton } from "@/components/states/skeletons";
import { EmptyState } from "@/components/states/empty-state";
import { Music2 } from "lucide-react";

export default async function HomePage() {
  const heroTrack = await db.track.findFirst({
    where: { isPublished: true, isFeatured: true },
    orderBy: { releaseDate: "desc" },
    include: { artist: true, album: true },
  });

  if (!heroTrack) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <EmptyState
          icon={Music2}
          title="No music published yet"
          description="Publish your first track from the admin dashboard to populate the homepage."
          actionLabel="Go to admin"
          actionHref="/admin/tracks/new"
        />
      </div>
    );
  }

  const player = toPlayerTrack(heroTrack, "hero");

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-10 px-4 py-6 sm:px-8 sm:py-8">
      <Hero
        track={player}
        description={heroTrack.description ?? `The latest from ${player.artistName}.`}
        albumHref={player.albumSlug ? `/album/${player.albumSlug}` : undefined}
      />

      <Suspense fallback={<RailSkeleton />}>
        <ContinueListeningSection />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <NewReleasesSection />
      </Suspense>

      <Suspense fallback={<RailSkeleton count={8} />}>
        <FeaturedArtistsSection />
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
    </div>
  );
}
