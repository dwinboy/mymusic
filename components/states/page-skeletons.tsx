import { MusicCardSkeleton, TrackRowSkeleton } from "@/components/states/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI, so a navigation lands on the shape of the page
 * instead of a blank while its data is fetched.
 *
 * Deliberately not used on /song/[slug]: suspending into a fallback stops the
 * artwork morph from pairing, and losing that transition would cost more than
 * the skeleton gains on a page that is fast anyway.
 */

/** A titled grid — the catalogue lists and the category indexes. */
export function GridPageSkeleton({ cards = 10 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 sm:py-12">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="mt-3 h-10 w-72 rounded-lg" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full rounded" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: cards }).map((_, i) => (
          <MusicCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** A hero over a track list — the category pages and search results. */
export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="pb-8">
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-12 sm:px-8 sm:pt-24">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="mt-3 h-12 w-80 max-w-full rounded-lg" />
        <Skeleton className="mt-4 h-4 w-[28rem] max-w-full rounded" />
        <Skeleton className="mt-7 h-11 w-44 rounded-full" />
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-1 px-4 sm:px-8">
        {Array.from({ length: rows }).map((_, i) => (
          <TrackRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
