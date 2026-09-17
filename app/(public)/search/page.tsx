import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { search, type SearchTerm } from "@/lib/search";
import { findTracks } from "@/lib/taxonomy";
import { parseDiscoveryFilters } from "@/lib/discovery-filters";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { toAlbumCard, toCreatorCard, toPlaylistCard } from "@/lib/catalog-cards";
import { TrackRow } from "@/components/music/track-row";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { AlbumCard, CreatorCard, PlaylistCard } from "@/components/music/collection-cards";
import { PaginatedTrackList } from "@/components/discovery/track-list";
import { PlayMixButtons } from "@/components/discovery/play-mix-buttons";
import { EmptyState } from "@/components/states/empty-state";
import { SearchBar } from "@/components/search/search-bar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  // Result pages are endless and thin; only the search page itself is indexable.
  return { title: q ? `“${q.trim()}”` : "Search", robots: q ? { index: false, follow: true } : undefined };
}

const TABS = [
  { key: "all", label: "All" },
  { key: "songs", label: "Songs" },
  { key: "artists", label: "Artists" },
  { key: "albums", label: "Albums" },
  { key: "playlists", label: "Playlists" },
  { key: "genres", label: "Genres" },
  { key: "moods", label: "Moods" },
  { key: "activities", label: "Activities" },
] as const;

const TAB_KIND = { genres: "GENRE", moods: "MOOD", activities: "ACTIVITY" } as const;

type TabKey = (typeof TABS)[number]["key"];

const KIND_LABEL: Record<string, string> = {
  GENRE: "Genre",
  MOOD: "Mood",
  ACTIVITY: "Activity",
  OCCASION: "Occasion",
  INSTRUMENT: "Instrument",
  VOCAL: "Vocals",
  LANGUAGE: "Language",
};

function TermPills({ terms }: { terms: SearchTerm[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {terms.map((term) => (
        <Link
          key={term.id}
          href={term.href}
          className="group flex items-center gap-2 rounded-full border border-border-strong py-1.5 pl-4 pr-3 text-sm text-foreground transition-colors hover:border-foreground-subtle hover:bg-surface"
        >
          {term.name}
          <span className="text-[11px] uppercase tracking-wide text-foreground-subtle">{KIND_LABEL[term.kind]}</span>
        </Link>
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q, type } = await searchParams;
  const query = (q ?? "").trim();

  if (query.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <div className="mb-8 md:hidden">
          <SearchBar />
        </div>
        <EmptyState
          icon={SearchIcon}
          title="Search Vibe Banger"
          description="Songs, creators, albums and playlists — or describe what you want: “sleep music”, “romantic piano wedding”, “calm focus”."
        />
      </div>
    );
  }

  const tab: TabKey = TABS.some((t) => t.key === type) ? (type as TabKey) : "all";
  const [results, session] = await Promise.all([search(query, { songs: 10, others: tab === "all" ? 12 : 48 }), auth()]);

  const songs = results.songs.map((t) => toPlayerTrack(t));
  const termsOf = (kind: string) => results.terms.filter((t) => t.kind === kind);
  const counts: Record<TabKey, number> = {
    all: 0,
    songs: results.songTotal,
    artists: results.artists.length,
    albums: results.albums.length,
    playlists: results.playlists.length,
    genres: termsOf("GENRE").length,
    moods: termsOf("MOOD").length,
    activities: termsOf("ACTIVITY").length,
  };
  const hasAnything = Object.values(counts).some((n) => n > 0) || results.terms.length > 0;
  const understood = results.appliedTerms;
  const recognised = results.interpretation.terms;
  const relaxed = understood.length > 0 && understood.length < recognised.length;
  // Leftover words are dropped when keeping them would leave nothing.
  const matchedText = understood.length > 0 ? new URLSearchParams(results.songsQuery).get("q") : null;

  // The Songs tab pages through the same query "See all" uses.
  let songsTab: { tracks: ReturnType<typeof toPlayerTrack>[]; cursor: string | null } | null = null;
  if (tab === "songs") {
    const { filter, sort } = await parseDiscoveryFilters(new URLSearchParams(results.songsQuery));
    const page = await findTracks(filter, { sort, limit: 30 });
    songsTab = { tracks: page.tracks.map((t) => toPlayerTrack(t)), cursor: page.nextCursor };
  }
  const liked = await getLikedTrackIds(session?.user?.id, [...songs, ...(songsTab?.tracks ?? [])].map((t) => t.id));

  const tabHref = (key: TabKey) => `/search?${new URLSearchParams({ q: query, ...(key === "all" ? {} : { type: key }) })}`;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <div className="mb-6 md:hidden">
        <SearchBar />
      </div>

      <h1 className="text-xl text-foreground-muted">
        Results for <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
      </h1>

      {hasAnything && (
        <nav aria-label="Result types" className="scrollbar-hidden -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {TABS.filter((t) => t.key === "all" || t.key === tab || counts[t.key] > 0).map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              aria-current={t.key === tab ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
                t.key === tab ? "border-foreground bg-foreground text-canvas" : "border-border-strong text-foreground-muted hover:text-foreground"
              )}
            >
              {t.label}
              {t.key !== "all" && <span className={cn("tabular text-xs", t.key === tab ? "text-canvas/70" : "text-foreground-subtle")}>{counts[t.key]}</span>}
            </Link>
          ))}
        </nav>
      )}

      {!hasAnything ? (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description="Try fewer words, a different spelling, or describe a mood or activity — “chill study”, “party dance”."
          actionLabel="Browse all songs"
          actionHref="/songs"
          className="mt-8"
        />
      ) : tab === "all" ? (
        <div className="mt-8 flex flex-col gap-10">
          {understood.length > 0 && results.songTotal > 0 && (
            <section className="rounded-2xl border border-accent/25 bg-accent/5 p-5 sm:p-6">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3.5 w-3.5" /> Music for
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{understood.map((t) => t.name).join(" · ")}</p>
              <p className="mt-1 text-sm text-foreground-muted">
                {relaxed
                  ? `Nothing is classified as ${recognised.map((t) => t.name).join(" + ")} yet — the closest match has ${results.songTotal} ${results.songTotal === 1 ? "song" : "songs"}`
                  : `${results.songTotal} ${results.songTotal === 1 ? "song" : "songs"} classified this way`}
                {matchedText && ` matching “${matchedText}”`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <PlayMixButtons query={results.songsQuery} label={understood.map((t) => t.name).join(" ")} />
              </div>
            </section>
          )}

          {songs.length > 0 && (
            <section>
              <SectionHeader title="Songs" href={`/songs?${results.songsQuery}`} />
              <div className="flex flex-col">
                {songs.map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i} queue={songs} initiallyLiked={liked.has(track.id)} />
                ))}
              </div>
              {results.songTotal > songs.length && (
                <Link href={tabHref("songs")} className="mt-3 inline-block text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
                  See all {results.songTotal} songs
                </Link>
              )}
            </section>
          )}

          {results.terms.length > 0 && (
            <section>
              <SectionHeader title="Browse" subtitle="Genres, moods, activities and more" />
              <TermPills terms={results.terms} />
            </section>
          )}

          {results.artists.length > 0 && (
            <section>
              <SectionHeader title="Artists" href={results.artists.length > 6 ? tabHref("artists") : undefined} />
              <HorizontalScroller>
                {results.artists.map((a) => (
                  <CreatorCard key={a.id} creator={toCreatorCard(a)} />
                ))}
              </HorizontalScroller>
            </section>
          )}

          {results.albums.length > 0 && (
            <section>
              <SectionHeader title="Albums" href={results.albums.length > 6 ? tabHref("albums") : undefined} />
              <HorizontalScroller>
                {results.albums.map((a) => (
                  <AlbumCard key={a.id} album={toAlbumCard(a)} />
                ))}
              </HorizontalScroller>
            </section>
          )}

          {results.playlists.length > 0 && (
            <section>
              <SectionHeader title="Playlists" href={results.playlists.length > 6 ? tabHref("playlists") : undefined} />
              <HorizontalScroller>
                {results.playlists.map((p) => (
                  <PlaylistCard key={p.id} playlist={toPlaylistCard(p)} />
                ))}
              </HorizontalScroller>
            </section>
          )}
        </div>
      ) : (
        <div className="mt-8">
          {tab === "songs" &&
            (songsTab && songsTab.tracks.length > 0 ? (
              <PaginatedTrackList
                initialTracks={songsTab.tracks}
                initialCursor={songsTab.cursor}
                query={results.songsQuery}
                likedIds={[...liked]}
                pageSize={30}
              />
            ) : (
              <EmptyState icon={SearchIcon} title="No songs match" />
            ))}
          {tab === "artists" && (
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {results.artists.map((a) => (
                <CreatorCard key={a.id} creator={toCreatorCard(a)} className="w-full sm:w-full" />
              ))}
            </div>
          )}
          {tab === "albums" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {results.albums.map((a) => (
                <AlbumCard key={a.id} album={toAlbumCard(a)} className="w-full sm:w-full" />
              ))}
            </div>
          )}
          {tab === "playlists" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {results.playlists.map((p) => (
                <PlaylistCard key={p.id} playlist={toPlaylistCard(p)} className="w-full sm:w-full" />
              ))}
            </div>
          )}
          {(tab === "genres" || tab === "moods" || tab === "activities") && (
            <TermPills terms={termsOf(TAB_KIND[tab])} />
          )}
        </div>
      )}
    </div>
  );
}
