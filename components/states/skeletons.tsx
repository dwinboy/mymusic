import { Skeleton } from "@/components/ui/skeleton";

export function TrackRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-2.5 py-2 md:grid-cols-[32px_auto_1fr_minmax(0,1fr)_auto_auto]">
      <Skeleton className="hidden h-4 w-4 md:block" />
      <Skeleton className="h-11 w-11 rounded-md" />
      <div className="min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="hidden h-3 w-24 md:block" />
      {/* Matches the row's length cell, which now shows at every width. */}
      <Skeleton className="h-3 w-8" />
      <Skeleton className="h-7 w-7 rounded-full" />
    </div>
  );
}

export function MusicCardSkeleton() {
  return (
    <div className="w-40 shrink-0 sm:w-44">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="mt-2.5 h-3.5 w-3/4" />
      <Skeleton className="mt-1.5 h-3 w-1/2" />
    </div>
  );
}

export function ArtistCardSkeleton() {
  return (
    <div className="w-36 shrink-0 sm:w-40">
      <Skeleton className="aspect-square w-full rounded-full" />
      <Skeleton className="mx-auto mt-2.5 h-3.5 w-2/3" />
      <Skeleton className="mx-auto mt-1.5 h-3 w-1/3" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Skeleton className="h-40 w-40 shrink-0 rounded-xl sm:h-56 sm:w-56" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-11 w-32 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <MusicCardSkeleton key={i} />
      ))}
    </div>
  );
}
