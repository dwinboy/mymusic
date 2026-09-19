import type { Metadata } from "next";
import { Disc3 } from "lucide-react";
import { albumCatalog } from "@/lib/catalog";
import { toAlbumCard } from "@/lib/catalog-cards";
import { albumListPage } from "@/lib/catalog-lists";
import { getTerms } from "@/lib/taxonomy";
import { FilterBar, type FilterDimension } from "@/components/discovery/filter-bar";
import { PaginatedCardGrid } from "@/components/catalog/paginated-card-grid";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { AlbumCard } from "@/components/music/collection-cards";
import { EmptyState } from "@/components/states/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Albums",
  description: "New, popular and featured albums on Vibe Banger, filterable by genre, year and creator.",
  alternates: { canonical: "/albums" },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AlbumsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["genre", "year", "creator"]) {
    const value = raw[key];
    if (value) params.set(key, Array.isArray(value) ? value.join(",") : value);
  }
  const filtered = [...params.keys()].length > 0;

  const [genres, years, creators, list, featured, newest, popular] = await Promise.all([
    getTerms("GENRE"),
    albumCatalog.years(),
    albumCatalog.creators(),
    albumListPage(params, null),
    filtered ? Promise.resolve([]) : albumCatalog.featured(12),
    filtered ? Promise.resolve([]) : albumCatalog.newReleases(12),
    filtered ? Promise.resolve([]) : albumCatalog.popular(12),
  ]);

  const dimensions: FilterDimension[] = [
    { param: "genre", label: "Genre", options: genres.filter((g) => !g.parentId).map((g) => ({ value: g.slug, label: g.name })) },
    { param: "year", label: "Year", single: true, options: years.map((y) => ({ value: String(y), label: String(y) })) },
    { param: "creator", label: "Creator", single: true, options: creators.map((c) => ({ value: c.slug, label: c.name })) },
  ];

  const rails = [
    { title: "Featured Albums", albums: featured },
    { title: "New Releases", albums: newest },
    { title: "Popular Albums", albums: popular },
  ].filter((rail) => rail.albums.length > 0);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Music</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Albums</h1>

      {!filtered && rails.length > 0 && (
        <div className="mt-8 flex flex-col gap-10">
          {rails.map((rail) => (
            <section key={rail.title}>
              <SectionHeader title={rail.title} />
              <HorizontalScroller>
                {rail.albums.map((album) => (
                  <AlbumCard key={album.id} album={toAlbumCard(album)} />
                ))}
              </HorizontalScroller>
            </section>
          ))}
        </div>
      )}

      <section className="mt-12">
        <SectionHeader
          title={filtered ? "Filtered albums" : "All Albums"}
          subtitle={list.total !== null ? `${list.total} ${list.total === 1 ? "album" : "albums"}` : undefined}
        />
        <FilterBar dimensions={dimensions} sorts={null} className="mb-6" />
        {list.items.length === 0 ? (
          <EmptyState
            icon={Disc3}
            title={filtered ? "No albums match those filters" : "No albums yet"}
            description={
              filtered
                ? "Try fewer filters, or browse everything."
                : "Creators release singles first. There is music here — it just isn't grouped into albums yet."
            }
            actionLabel={filtered ? "Clear filters" : "Browse songs"}
            actionHref={filtered ? "/albums" : "/songs"}
          />
        ) : (
          <PaginatedCardGrid key={params.toString()} type="albums" initialItems={list.items} initialCursor={list.nextCursor} query={params.toString()} />
        )}
      </section>
    </div>
  );
}
