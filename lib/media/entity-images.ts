import { resolveImageUrl, type ImageSize } from "./image-service";
import { categoryPhotoForKey } from "./category-photos";

/** Convenience wrappers around resolveImageUrl for entities queried directly (not via toPlayerTrack). */

/**
 * A track's artwork: its own, then its album's, then the photo for whatever
 * category it was classified as. The last of those is a stand-in rather than
 * artwork — it keeps a card, a hero or a share image from being an empty
 * tile, which is the state a track sits in between upload and artwork.
 */
export function resolveTrackCoverUrl(
  track: {
    coverUrl: string | null;
    coverImagePublicId?: string | null;
    artworkCategory?: string | null;
    album?: { coverUrl: string | null; coverImagePublicId?: string | null } | null;
  },
  size: ImageSize
): string | null {
  return (
    resolveImageUrl(
      {
        publicId: track.coverImagePublicId ?? track.album?.coverImagePublicId,
        fallbackUrl: track.coverUrl ?? track.album?.coverUrl ?? null,
      },
      size
    ) ?? categoryPhotoForKey(track.artworkCategory)
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
