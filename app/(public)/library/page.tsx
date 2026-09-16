import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, ListMusic, History, Plus } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackRow } from "@/components/music/track-row";
import { EmptyState } from "@/components/states/empty-state";
import { CreatePlaylistButton } from "@/components/playlist/create-playlist-button";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { formatCompactNumber } from "@/lib/utils";

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
  const defaultTab = tab === "playlists" || tab === "history" ? tab : "liked";

  const [favorites, playlists, history] = await Promise.all([
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
      </Tabs>
    </div>
  );
}
