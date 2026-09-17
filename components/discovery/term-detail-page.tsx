import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Compass } from "lucide-react";
import { auth } from "@/auth";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import {
  getTermTree,
  subtreeIds,
  getTermArtwork,
  countTracksPerTerm,
  getIntersections,
  intersectionTitle,
  getTopArtistsForTerms,
  findTracks,
  termHref,
  kindIndexHref,
  type BrowsableKind,
  type TermNode,
} from "@/lib/taxonomy";
import { FILTER_PARAMS, parseDiscoveryFilters } from "@/lib/discovery-filters";
import { buildFilterDimensions, KIND_LABEL } from "@/lib/filter-dimensions";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";
import { ArtistCard } from "@/components/music/artist-card";
import { EmptyState } from "@/components/states/empty-state";
import { PlayMixButtons } from "@/components/discovery/play-mix-buttons";
import { FilterBar } from "@/components/discovery/filter-bar";
import { PaginatedTrackList } from "@/components/discovery/track-list";

type SearchParams = Record<string, string | string[] | undefined>;

const PARAM_FOR_KIND = Object.fromEntries(Object.entries(FILTER_PARAMS).map(([p, k]) => [k, p])) as Record<string, string>;

/** Other dimensions worth filtering by on each kind's page — never the kind itself. */
const FILTER_KINDS: Record<BrowsableKind, ("GENRE" | "MOOD" | "ACTIVITY" | "OCCASION" | "VOCAL" | "INSTRUMENT" | "LANGUAGE")[]> = {
  GENRE: ["MOOD", "ACTIVITY", "VOCAL", "LANGUAGE"],
  MOOD: ["GENRE", "ACTIVITY", "VOCAL", "INSTRUMENT"],
  ACTIVITY: ["GENRE", "MOOD", "VOCAL", "INSTRUMENT"],
  OCCASION: ["GENRE", "MOOD", "VOCAL", "INSTRUMENT"],
};

/** SEO title per kind: "Ambient Music", "Sleep Music", "Wedding Music". */
function pageTitle(node: TermNode) {
  return `${node.name} Music`;
}

function toQuery(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

export async function generateTermMetadata(kind: BrowsableKind, slug: string): Promise<Metadata> {
  const node = await getTermTree(kind, slug);
  if (!node) return {};
  const [artwork] = await Promise.all([getTermArtwork([node], "large")]);
  const image = artwork.get(node.id);
  const title = pageTitle(node);
  const description =
    node.description ?? `Discover ${node.name.toLowerCase()} AI music — curated by sound, mood and moment.`;
  const canonical = termHref(kind, slug)!;

  return {
    title,
    description,
    // Filtered variants (?mood=…) point back here rather than competing as
    // their own thin pages.
    alternates: { canonical },
    openGraph: { title, description, url: canonical, images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export async function TermDetailPage({
  kind,
  slug,
  searchParams,
}: {
  kind: BrowsableKind;
  slug: string;
  searchParams: SearchParams;
}) {
  const node = await getTermTree(kind, slug);
  if (!node) notFound();

  const param = PARAM_FOR_KIND[kind];
  const pinned = { [param]: node.slug };
  const ids = subtreeIds(node);

  const [counts, artwork, session] = await Promise.all([
    countTracksPerTerm(kind),
    getTermArtwork([node], "hero"),
    auth(),
  ]);
  const total = counts.get(node.id) ?? 0;
  const heroImage = artwork.get(node.id);

  // The main list honours whatever filters are in the URL, always scoped to
  // this term. Parsed by the same function /api/tracks uses, so "Load more"
  // and Play continue exactly the set shown.
  const userParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && key !== param && key !== "cursor") {
      userParams[key] = Array.isArray(value) ? value.join(",") : value;
    }
  }
  const listQuery = toQuery({ ...userParams, ...pinned });
  const { filter, sort } = await parseDiscoveryFilters(new URLSearchParams(listQuery));

  const childSections = node.children.filter((child) => (counts.get(child.id) ?? 0) > 0);

  const [mainPage, dimensions, intersections, topArtists, childRails] = await Promise.all([
    findTracks(filter, { sort, limit: 24 }),
    buildFilterDimensions(FILTER_KINDS[kind]),
    getIntersections(ids, kind, { baseTrackCount: total }),
    getTopArtistsForTerms(ids, 10),
    Promise.all(
      childSections.map(async (child) => {
        const { filter: childFilter } = await parseDiscoveryFilters(new URLSearchParams({ [param]: child.slug }));
        const { tracks } = await findTracks(childFilter, { sort: "recommended", limit: 12 });
        return { child, tracks: tracks.map((t) => toPlayerTrack(t)) };
      })
    ),
  ]);

  const intersectionRails = await Promise.all(
    intersections.map(async ({ term }) => {
      const query = toQuery({ ...pinned, [PARAM_FOR_KIND[term.kind]]: term.slug });
      const { filter: f } = await parseDiscoveryFilters(new URLSearchParams(query));
      const { tracks } = await findTracks(f, { sort: "recommended", limit: 12 });
      return { term, title: intersectionTitle(node, term), tracks: tracks.map((t) => toPlayerTrack(t)) };
    })
  );

  const mainTracks = mainPage.tracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, mainTracks.map((t) => t.id));
  const hasFilters = Object.keys(userParams).some((k) => k !== "sort");

  return (
    <div className="pb-8">
      <header className="relative overflow-hidden">
        {heroImage && (
          <div className="absolute inset-0">
            <Image src={heroImage} alt="" fill priority sizes="100vw" className="scale-110 object-cover opacity-45 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/75 to-canvas/30" />
          </div>
        )}
        <div className="relative mx-auto max-w-[1600px] px-4 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-16">
          <Link
            href={kindIndexHref(kind)}
            className="text-xs font-medium uppercase tracking-[0.2em] text-accent transition-colors hover:text-accent-hover"
          >
            {KIND_LABEL[kind]}
          </Link>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">{node.name}</h1>
          {node.description && (
            <p className="mt-4 max-w-2xl text-base text-foreground-muted sm:text-lg">{node.description}</p>
          )}
          <p className="mt-3 text-sm text-foreground-subtle">
            {total} {total === 1 ? "track" : "tracks"}
          </p>
          {total > 0 && (
            <div className="mt-7">
              <PlayMixButtons query={toQuery(pinned)} label={node.name} />
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-12 px-4 sm:px-8">
        {total === 0 ? (
          <EmptyState
            icon={Compass}
            title={`No ${node.name.toLowerCase()} music yet`}
            description="Creators haven't classified anything here yet. Explore another corner of the catalogue in the meantime."
            actionLabel="Back to Discover"
            actionHref="/discover"
          />
        ) : (
          <>
            {childRails.map(
              ({ child, tracks }) =>
                tracks.length > 0 && (
                  <section key={child.id}>
                    <SectionHeader title={child.name} subtitle={child.description ?? undefined} href={termHref(kind, child.slug)!} />
                    {child.children.some((g) => (counts.get(g.id) ?? 0) > 0) && (
                      <div className="-mt-1 mb-4 flex flex-wrap gap-2">
                        {child.children
                          .filter((g) => (counts.get(g.id) ?? 0) > 0)
                          .map((g) => (
                            <Link
                              key={g.id}
                              href={termHref(kind, g.slug)!}
                              className="rounded-full border border-border-strong px-3 py-1 text-xs text-foreground-muted transition-colors hover:border-foreground-subtle hover:text-foreground"
                            >
                              {g.name}
                            </Link>
                          ))}
                      </div>
                    )}
                    <HorizontalScroller>
                      {tracks.map((track) => (
                        <MusicCard key={track.id} track={track} queue={tracks} />
                      ))}
                    </HorizontalScroller>
                  </section>
                )
            )}

            {intersectionRails.map(
              ({ term, title, tracks }) =>
                tracks.length > 0 && (
                  <section key={term.id}>
                    <SectionHeader title={title} />
                    <HorizontalScroller>
                      {tracks.map((track) => (
                        <MusicCard key={track.id} track={track} queue={tracks} />
                      ))}
                    </HorizontalScroller>
                  </section>
                )
            )}

            <section>
              <SectionHeader title={`All ${node.name}`} subtitle={hasFilters ? "Filtered" : undefined} />
              <FilterBar dimensions={dimensions} className="mb-5" />
              {mainTracks.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  title="Nothing matches those filters"
                  description="Try removing a filter to widen the selection."
                />
              ) : (
                <PaginatedTrackList
                  // Remount when the query changes so paging restarts cleanly.
                  key={listQuery}
                  initialTracks={mainTracks}
                  initialCursor={mainPage.nextCursor}
                  query={listQuery}
                  likedIds={[...liked]}
                />
              )}
            </section>

            {topArtists.length > 0 && (
              <section>
                <SectionHeader title={`${node.name} Creators`} href="/artists" />
                <HorizontalScroller>
                  {topArtists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </HorizontalScroller>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
