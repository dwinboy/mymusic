import type { Metadata } from "next";
import Link from "next/link";
import { Heart, ListMusic, History, Disc3, Users, BarChart3, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LibraryTracks } from "@/components/library/library-tracks";
import { EmptyState } from "@/components/states/empty-state";
import { SignedOutLibrary } from "@/components/library/signed-out-library";
import { CreatePlaylistButton } from "@/components/playlist/create-playlist-button";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { formatCompactNumber } from "@/lib/utils";
import { AlbumCard, CreatorCard } from "@/components/music/collection-cards";
import { toAlbumCard, toCreatorCard } from "@/lib/catalog-cards";
import { PUBLIC_ALBUM_WHERE, PUBLIC_TRACK_WHERE } from "@/lib/public-scope";

export const metadata: Metadata = {
  title: "Your Library",
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  // Signed out, this page explains itself rather than bouncing someone to a
  // login form that never says what they would be signing in for.
  if (!session?.user) return <SignedOutLibrary />;

  const { tab } = await searchParams;
  const TABS = ["liked", "playlists", "history", "albums", "following"];
  const defaultTab = tab && TABS.includes(tab) ? tab : "liked";

  const [favorites, playlists, history, savedAlbums, follows] = await Promise.all([
    db.favorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { track: { include: { artist: true, album: true } } },
    }),
    db.playlist.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { tracks: true } } },
    }),
    db.listeningHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { playedAt: "desc" },
      take: 30,
      distinct: ["trackId"],
      include: { track: { include: { artist: true, album: true } } },
    }),
    db.savedAlbum.findMany({
      where: { userId: session.user.id, album: PUBLIC_ALBUM_WHERE },
      orderBy: { createdAt: "desc" },
      include: { album: { include: { artist: { select: { name: true } } } } },
    }),
    db.follow.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { artist: { include: { _count: { select: { tracks: { where: PUBLIC_TRACK_WHERE } } } } } },
    }),
  ]);

  const likedTracks = favorites.map((f) => toPlayerTrack(f.track));
  const historyTracks = history.map((h) => toPlayerTrack(h.track));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Library</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your Library</h1>

      <div className="mt-6">
        <InstallPrompt />
      </div>

      <Tabs defaultValue={defaultTab} className="mt-8">
        {/* Short labels: under a heading that already says "Your Library",
            "Recently Played" and "Saved Albums" say nothing that "History"
            and "Albums" don't, and the words were what pushed the strip
            past the width of a phone. */}
        <TabsList>
          <TabsTrigger value="liked">Liked</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="liked">
          {likedTracks.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No liked songs yet"
              description="Tap the heart on any song to save it here."
              actionLabel="Discover music"
              actionHref="/discover"
            />
          ) : (
            <LibraryTracks tracks={likedTracks} initiallyLiked />
          )}
        </TabsContent>

        <TabsContent value="playlists">
          {playlists.length === 0 ? (
            // No header here: "0 playlists" above a panel that already says
            // there are none is the count stating the obvious twice. The
            // empty state carries its own way to make one.
            <>
              <EmptyState
                icon={ListMusic}
                title="No playlists yet"
                description="Create your first playlist to start organizing music."
              />
              <div className="mt-4 flex justify-center">
                <CreatePlaylistButton />
              </div>
            </>
          ) : (
            <>
              {/* Count on the left, action on the right — the same shape the
                  track tabs use, instead of a button floating alone above the
                  grid with nothing to say how much is in it. */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-foreground-muted">
                  {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
                </p>
                <CreatePlaylistButton />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist/${playlist.slug}`}
                  className="group rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong hover:bg-surface-hover"
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-surface-active text-foreground-subtle">
                    <ListMusic className="h-8 w-8" />
                  </div>
                  <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{playlist.title}</p>
                  <p className="text-xs text-foreground-muted">{formatCompactNumber(playlist._count.tracks)} tracks</p>
                </Link>
              ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          {historyTracks.length === 0 ? (
            <EmptyState icon={History} title="No listening history yet" description="Tracks you play will show up here." />
          ) : (
            <>
              {/* The history was only ever a list. What it adds up to — hours
                  listened, who you actually played most — is the part worth
                  seeing, and it lives one tap away rather than on top of the
                  list someone came here to read. */}
              <Link
                href="/library/listening"
                className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-hover"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Your listening</span>
                  <span className="block text-xs text-foreground-muted">
                    Hours listened, and the songs and artists you came back to.
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-foreground-subtle" />
              </Link>
              <LibraryTracks tracks={historyTracks} recentLabel="Recently played" />
            </>
          )}
        </TabsContent>

        <TabsContent value="albums">
          {savedAlbums.length === 0 ? (
            <EmptyState
              icon={Disc3}
              title="No saved albums yet"
              description="Save an album from its page to find it here."
              actionLabel="Browse albums"
              actionHref="/albums"
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-foreground-muted">
                {savedAlbums.length} {savedAlbums.length === 1 ? "album" : "albums"}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {savedAlbums.map((saved) => (
                  <AlbumCard key={saved.id} album={toAlbumCard(saved.album)} className="w-full sm:w-full" />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="following">
          {follows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="You're not following anyone yet"
              description="Follow a creator to keep their new music close."
              actionLabel="Browse creators"
              actionHref="/artists"
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-foreground-muted">
                Following {follows.length} {follows.length === 1 ? "creator" : "creators"}
              </p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
                {follows.map((follow) => (
                  <CreatorCard key={follow.id} creator={toCreatorCard(follow.artist)} className="w-full sm:w-full" />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
