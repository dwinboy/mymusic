import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { permanentRedirect } from "next/navigation";
import { ListMusic } from "lucide-react";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";
import { ArtistCard } from "@/components/music/artist-card";
import { EmptyState } from "@/components/states/empty-state";
import { QuickIntents } from "@/components/discovery/quick-intents";
import { TermRail } from "@/components/discovery/term-rail";
import { trendingService } from "@/lib/trending";
import { termHref } from "@/lib/taxonomy";
import { musicNavLinks } from "@/components/layout/nav-links";

export const metadata: Metadata = {
  title: "Discover",
  description: "Find AI music by sound, mood, activity or occasion — from deep sleep and focus to weddings and workouts.",
  alternates: { canonical: "/discover" },
};

export const dynamic = "force-dynamic";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  // Genre browsing used to live at /discover?genre=…; keep old links and
  // shares working by sending them to the canonical genre page.
  const { genre } = await searchParams;
  if (genre) permanentRedirect(termHref("GENRE", genre)!);

  const [trending, risingArtists, playlists] = await Promise.all([
    trendingService.tracks(12),
    trendingService.risingArtists(10),
    db.playlist.findMany({
      where: { isPublic: true },
      // Postgres orders enums by declaration (USER, EDITORIAL, ALGORITHMIC),
      // so descending puts platform-made collections ahead of listener ones.
      orderBy: [{ isFeatured: "desc" }, { kind: "desc" }, { updatedAt: "desc" }],
      take: 10,
      include: { _count: { select: { tracks: true } } },
    }),
  ]);

  const trendingTracks = trending.tracks.map((t) => toPlayerTrack(t));
  const catalogueIsEmpty = trendingTracks.length === 0;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-12 px-4 py-6 sm:px-8 sm:py-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Discover</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Find your sound.
        </h1>
        <p className="mt-3 max-w-xl text-base text-foreground-muted">
          Music by what it sounds like, how it feels, what you&apos;re doing, or the moment you&apos;re in.
        </p>
        {/* The catalogue lives under "Music" in the desktop header; phones reach it from here. */}
        <nav aria-label="Browse the catalogue" className="scrollbar-hidden -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {musicNavLinks.slice(0, 4).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              <link.icon className="h-4 w-4 text-accent" />
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {catalogueIsEmpty ? (
        <EmptyState
          icon={ListMusic}
          title="Nothing to discover yet"
          description="Once creators publish music, it'll be organised here by genre, mood, activity and occasion."
        />
      ) : (
        <>
          <QuickIntents />

          <TermRail kind="MOOD" title="Explore by Mood" subtitle="How you want to feel" />
          <TermRail kind="GENRE" title="Explore by Genre" subtitle="What it sounds like" />
          <TermRail kind="ACTIVITY" title="Music for Every Moment" subtitle="What you're doing" />
          <TermRail kind="OCCASION" title="Music for Your Occasion" subtitle="Where it's playing" size="lg" />

          {trendingTracks.length > 0 && (
            <section>
              {/* Only called trending when it actually is; a quiet platform's
                  fallback list is labelled for what it is. */}
              <SectionHeader
                title={trending.organic ? "Trending Now" : "Handpicked for You"}
                subtitle={trending.organic ? "Gaining listeners this week" : "Featured and newly released"}
              />
              <HorizontalScroller>
                {trendingTracks.map((track) => (
                  <MusicCard key={track.id} track={track} queue={trendingTracks} />
                ))}
              </HorizontalScroller>
            </section>
          )}

          {risingArtists.length > 0 && (
            <section>
              <SectionHeader title="Rising Creators" subtitle="Worth a listen" href="/artists" />
              <HorizontalScroller>
                {risingArtists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </HorizontalScroller>
            </section>
          )}

          {playlists.length > 0 && (
            <section>
              <SectionHeader title="Featured Playlists" />
              <HorizontalScroller>
                {playlists.map((playlist) => (
                  <Link key={playlist.id} href={`/playlist/${playlist.slug}`} className="group w-40 shrink-0 sm:w-44">
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
                      {playlist.coverUrl ? (
                        <Image src={playlist.coverUrl} alt={playlist.title} fill sizes="176px" className="object-cover" />
                      ) : (
                        <ListMusic className="h-8 w-8 text-foreground-subtle" />
                      )}
                    </div>
                    <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">
                      {playlist.title}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {playlist._count.tracks} {playlist._count.tracks === 1 ? "track" : "tracks"}
                    </p>
                  </Link>
                ))}
              </HorizontalScroller>
            </section>
          )}
        </>
      )}
    </div>
  );
}
