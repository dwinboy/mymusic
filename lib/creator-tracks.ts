import { db } from "@/lib/db";
import { resolveImageUrl } from "@/lib/media/image-service";
import { creatorTrackStatus } from "@/lib/creator-status";
import type { StudioTrack } from "@/components/creator/studio-track-row";
import type { Prisma } from "@/lib/generated/prisma/client";

const STUDIO_INCLUDE = {
  artist: { select: { name: true } },
  album: { select: { title: true, coverUrl: true, coverImagePublicId: true } },
} as const;

type StudioTrackRecord = Prisma.TrackGetPayload<{ include: typeof STUDIO_INCLUDE }>;

export function toStudioTrack(track: StudioTrackRecord): StudioTrack {
  return {
    id: track.id,
    title: track.title,
    slug: track.slug,
    coverUrl: resolveImageUrl(
      {
        publicId: track.coverImagePublicId ?? track.album?.coverImagePublicId,
        fallbackUrl: track.coverUrl ?? track.album?.coverUrl ?? null,
      },
      "thumbnail"
    ),
    artistName: track.artist.name,
    albumTitle: track.album?.title ?? null,
    duration: track.duration,
    status: creatorTrackStatus(track),
    note: track.moderationNote,
    plays: track.playCount,
  };
}

/** Tracks across every profile the user owns, newest activity first. */
export async function getStudioTracks(profileIds: string[], where: Prisma.TrackWhereInput = {}, take = 200) {
  if (profileIds.length === 0) return [];
  const tracks = await db.track.findMany({
    where: { artistId: { in: profileIds }, ...where },
    orderBy: { updatedAt: "desc" },
    take,
    include: STUDIO_INCLUDE,
  });
  return tracks.map(toStudioTrack);
}
