import { resolveImageUrl } from "@/lib/media/image-service";
import { categoryPhotoForSlug } from "@/lib/media/category-photos";
import type { AlbumCardData, CreatorCardData, PlaylistCardData } from "@/components/music/collection-cards";

/** Server-side: turns catalogue rows into card data with resolved image URLs. */

export function toAlbumCard(album: {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  coverImagePublicId: string | null;
  releaseDate: Date | null;
  artist?: { name: string } | null;
}, opts: { showArtist?: boolean } = {}): AlbumCardData {
  const year = album.releaseDate ? album.releaseDate.getUTCFullYear() : null;
  return {
    id: album.id,
    slug: album.slug,
    title: album.title,
    cover: resolveImageUrl({ publicId: album.coverImagePublicId, fallbackUrl: album.coverUrl }, "small"),
    subtitle: [opts.showArtist === false ? null : album.artist?.name, year].filter(Boolean).join(" · "),
  };
}

export function toPlaylistCard(playlist: {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  coverImagePublicId: string | null;
  kind: "USER" | "EDITORIAL" | "ALGORITHMIC";
  user?: { name: string | null } | null;
  _count: { tracks: number };
}): PlaylistCardData {
  const byline = playlist.kind === "EDITORIAL" ? "Vibe Banger" : playlist.kind === "ALGORITHMIC" ? "Collection" : playlist.user?.name ? `By ${playlist.user.name}` : null;
  const count = `${playlist._count.tracks} ${playlist._count.tracks === 1 ? "track" : "tracks"}`;
  return {
    id: playlist.id,
    slug: playlist.slug,
    title: playlist.title,
    // A playlist named after a category — "Deep Focus", "Wedding Reception" —
    // borrows that category's photo when it has no artwork of its own.
    cover:
      resolveImageUrl({ publicId: playlist.coverImagePublicId, fallbackUrl: playlist.coverUrl }, "small") ??
      categoryPhotoForSlug(playlist.slug),
    kind: playlist.kind,
    subtitle: [byline, count].filter(Boolean).join(" · "),
  };
}

export function toCreatorCard(
  artist: { id: string; slug: string; name: string; avatarUrl: string | null; avatarImagePublicId: string | null; _count?: { tracks: number } },
  subtitle?: string
): CreatorCardData {
  return {
    id: artist.id,
    slug: artist.slug,
    name: artist.name,
    avatar: resolveImageUrl({ publicId: artist.avatarImagePublicId, fallbackUrl: artist.avatarUrl }, "small"),
    subtitle: subtitle ?? (artist._count ? `${artist._count.tracks} ${artist._count.tracks === 1 ? "track" : "tracks"}` : "Creator"),
  };
}
