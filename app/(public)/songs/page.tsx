import type { Metadata } from "next";
import { Music2 } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildTrackWhere, findTracks } from "@/lib/taxonomy";
import { parseDiscoveryFilters } from "@/lib/discovery-filters";
import { buildFilterDimensions } from "@/lib/filter-dimensions";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { FilterBar } from "@/components/discovery/filter-bar";
import { PaginatedTrackList } from "@/components/discovery/track-list";
import { PlayMixButtons } from "@/components/discovery/play-mix-buttons";
import { EmptyState } from "@/components/states/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Songs",
  description: "Every song on Vibe Banger. Filter by genre, mood, activity, occasion, language, vocals, energy and length.",
  // Filtered variants point back here rather than competing as thin pages.
  alternates: { canonical: "/songs" },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SongsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || key === "cursor") continue;
    query.set(key, Array.isArray(value) ? value.join(",") : value);
  }
  const listQuery = query.toString();

  const { filter, sort } = await parseDiscoveryFilters(query);
  const [page, total, dimensions, session] = await Promise.all([
    findTracks(filter, { sort, limit: 30 }),
    db.track.count({ where: buildTrackWhere(filter) }),
    buildFilterDimensions(["GENRE", "MOOD", "ACTIVITY", "OCCASION", "LANGUAGE", "VOCAL"]),
    auth(),
  ]);

  const tracks = page.tracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, tracks.map((t) => t.id));
  const filtered = [...query.keys()].some((k) => k !== "sort");

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Music</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Songs</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {total.toLocaleString()} {total === 1 ? "song" : "songs"}
            {filtered && " match your filters"}
          </p>
        </div>
        {total > 0 && <PlayMixButtons query={listQuery} label={filtered ? "these songs" : "all songs"} />}
      </div>

      <FilterBar dimensions={dimensions} className="mb-6 mt-6" />

      {tracks.length === 0 ? (
        <EmptyState
          icon={Music2}
          title={filtered ? "Nothing matches those filters" : "No songs yet"}
          description={filtered ? "Try removing a filter to widen the selection." : undefined}
          actionLabel={filtered ? "Clear filters" : undefined}
          actionHref={filtered ? "/songs" : undefined}
        />
      ) : (
        <PaginatedTrackList
          key={listQuery}
          initialTracks={tracks}
          initialCursor={page.nextCursor}
          query={listQuery}
          likedIds={[...liked]}
          pageSize={30}
        />
      )}
    </div>
  );
}
