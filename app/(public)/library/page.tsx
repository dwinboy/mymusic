import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, ListMusic, History, Disc3, Users } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackRow } from "@/components/music/track-row";
import { EmptyState } from "@/components/states/empty-state";
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
  if (!session?.user) redirect("/login?callbackUrl=/library");

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
        <TabsList>
          <TabsTrigger value="liked">Liked Songs</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="history">Recently Played</TabsTrigger>
          <TabsTrigger value="albums">Saved Albums</TabsTrigger>
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
            <div className="flex flex-col">
              {likedTracks.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} queue={likedTracks} initiallyLiked />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="playlists">
          <div className="mb-6 flex justify-end">
            <CreatePlaylistButton />
          </div>
          {playlists.length === 0 ? (
            <EmptyState
              icon={ListMusic}
              title="No playlists yet"
              description="Create your first playlist to start organizing music."
            />
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="history">
          {historyTracks.length === 0 ? (
            <EmptyState icon={History} title="No listening history yet" description="Tracks you play will show up here." />
          ) : (
            <div className="flex flex-col">
              {historyTracks.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} queue={historyTracks} />
              ))}
            </div>
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {savedAlbums.map((saved) => (
                <AlbumCard key={saved.id} album={toAlbumCard(saved.album)} className="w-full sm:w-full" />
              ))}
            </div>
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
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
              {follows.map((follow) => (
                <CreatorCard key={follow.id} creator={toCreatorCard(follow.artist)} className="w-full sm:w-full" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
