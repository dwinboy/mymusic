import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ListMusic } from "lucide-react";
import { auth } from "@/auth";
import { getPlaylistBySlug } from "@/lib/queries";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { PlayButton } from "@/components/player/play-button";
import { ShufflePlayButton } from "@/components/music/shuffle-play-button";
import { ShareMenu } from "@/components/music/share-menu";
import { PlaylistOwnerMenu } from "@/components/playlist/playlist-owner-menu";
import { PlaylistTrackList } from "@/components/playlist/playlist-track-list";
import { EmptyState } from "@/components/states/empty-state";
import { formatDurationLong } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const playlist = await getPlaylistBySlug(slug);
  if (!playlist || !playlist.isPublic) return {};

  return {
    title: playlist.title,
    description: playlist.description || `${playlist.title} — a playlist on Vibe Banger.`,
    openGraph: {
      title: playlist.title,
      description: playlist.description || undefined,
      type: "music.playlist",
      images: playlist.coverUrl ? [{ url: playlist.coverUrl }] : undefined,
    },
  };
}

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [playlist, session] = await Promise.all([getPlaylistBySlug(slug), auth()]);

  const isOwner = !!session?.user && playlist?.userId === session.user.id;
  if (!playlist || (!playlist.isPublic && !isOwner)) notFound();

  const playerTracks = playlist.tracks.map((pt) => toPlayerTrack(pt.track));
  const liked = await getLikedTrackIds(session?.user?.id, playerTracks.map((t) => t.id));
  const totalSeconds = playerTracks.reduce((sum, t) => sum + t.duration, 0);
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/playlist/${playlist.slug}`;
  const coverTracks = playerTracks.slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
        <div className="grid aspect-square w-full max-w-xs shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-xl bg-surface shadow-elevated sm:w-64">
          {coverTracks.length > 0 ? (
            coverTracks.map((t) => (
              <div key={t.id} className="relative">
                {t.coverUrl && <Image src={t.coverUrl} alt="" fill sizes="128px" className="object-cover" />}
              </div>
            ))
          ) : (
            <div className="col-span-2 row-span-2 flex items-center justify-center text-foreground-subtle">
              <ListMusic className="h-12 w-12" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-subtle">
            Playlist {!playlist.isPublic && "· Private"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{playlist.title}</h1>
          {playlist.description && <p className="mt-3 max-w-xl text-sm text-foreground-muted">{playlist.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-muted">
            <span>{playlist.user.name ?? "Vibe Banger"}</span>
            <span>·</span>
            <span>{playerTracks.length} tracks</span>
            {totalSeconds > 0 && (
              <>
                <span>·</span>
                <span>{formatDurationLong(totalSeconds)}</span>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {playerTracks[0] && <PlayButton track={playerTracks[0]} queue={playerTracks} size="lg" />}
            <ShufflePlayButton tracks={playerTracks} />
            <ShareMenu url={shareUrl} title={playlist.title} text={`${playlist.title} — a playlist on Vibe Banger`} size="lg" className="rounded-full border border-border-strong p-2.5" />
            {isOwner && <PlaylistOwnerMenu playlistId={playlist.id} currentTitle={playlist.title} />}
          </div>
        </div>
      </div>

      <div className="mt-10">
        {playerTracks.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="This playlist is empty"
            description="Add songs from any song page using the “Add to playlist” action."
          />
        ) : (
          <PlaylistTrackList
            tracks={playerTracks}
            likedIds={Array.from(liked)}
            playlistId={playlist.id}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
}
