import { resolveImageUrl, type ImageSize } from "./image-service";

/** Convenience wrappers around resolveImageUrl for entities queried directly (not via toPlayerTrack). */

export function resolveTrackCoverUrl(
  track: { coverUrl: string | null; coverImagePublicId?: string | null; album?: { coverUrl: string | null; coverImagePublicId?: string | null } | null },
  size: ImageSize
): string | null {
  return resolveImageUrl(
    {
      publicId: track.coverImagePublicId ?? track.album?.coverImagePublicId,
      fallbackUrl: track.coverUrl ?? track.album?.coverUrl ?? null,
    },
    size
  );
}

export function resolveAlbumCoverUrl(
  album: { coverUrl: string | null; coverImagePublicId?: string | null },
  size: ImageSize
): string | null {
  return resolveImageUrl({ publicId: album.coverImagePublicId, fallbackUrl: album.coverUrl }, size);
}

export function resolveArtistAvatarUrl(
  artist: { avatarUrl: string | null; avatarImagePublicId?: string | null },
  size: ImageSize
): string | null {
  return resolveImageUrl({ publicId: artist.avatarImagePublicId, fallbackUrl: artist.avatarUrl }, size);
}

export function resolveArtistCoverUrl(
  artist: { coverUrl: string | null; coverImagePublicId?: string | null },
  size: ImageSize
): string | null {
  return resolveImageUrl({ publicId: artist.coverImagePublicId, fallbackUrl: artist.coverUrl }, size);
}
