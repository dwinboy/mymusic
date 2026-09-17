import { Prisma } from "@/lib/generated/prisma/client";
import type { PlayerTrack } from "@/lib/types";
import { getStreamingUrl, getDownloadUrl } from "@/lib/media/audio-service";
import { resolveImageUrl, type ImageSize } from "@/lib/media/image-service";

const trackWithRelations = Prisma.validator<Prisma.TrackDefaultArgs>()({
  include: { artist: true, album: true },
});

export type TrackWithRelations = Prisma.TrackGetPayload<typeof trackWithRelations>;

export function toPlayerTrack(track: TrackWithRelations, coverSize: ImageSize = "medium"): PlayerTrack {
  const cover = resolveImageUrl(
    {
      publicId: track.coverImagePublicId ?? track.album?.coverImagePublicId,
      fallbackUrl: track.coverUrl ?? track.album?.coverUrl ?? null,
    },
    coverSize
  );

  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    artistName: track.artist.name,
    artistSlug: track.artist.slug,
    albumTitle: track.album?.title ?? null,
    albumSlug: track.album?.slug ?? null,
    coverUrl: cover,
    // Empty string, not null: a not-yet-processed track shouldn't be in a
    // public listing at all (queries filter isPublished), and the player
    // simply fails to load if it ever is — never a crash.
    audioUrl: getStreamingUrl(track) ?? "",
    downloadUrl: getDownloadUrl(track),
    duration: track.duration,
    downloadEnabled: track.downloadEnabled,
    isExplicit: track.isExplicit,
    lyrics: track.lyrics,
  };
}
