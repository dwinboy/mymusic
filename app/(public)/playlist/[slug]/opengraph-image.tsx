import { getPlaylistBySlug } from "@/lib/queries";
import { resolveTrackCoverUrl } from "@/lib/media/entity-images";
import { playlistPreviewCard } from "@/lib/share-images";

/**
 * The link preview for a shared playlist. Only public ones get a card:
 * a private playlist 404s for whoever opened the link, and a preview
 * showing its name and artwork would leak exactly what the page withheld.
 */

export const alt = "Playlist artwork, name and owner on Vibe Banger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const playlist = await getPlaylistBySlug(slug);
  if (!playlist || !playlist.isPublic) return new Response("Not found", { status: 404 });

  const first = playlist.tracks[0]?.track ?? null;
  return playlistPreviewCard(
    {
      title: playlist.title,
      trackCount: playlist.tracks.length,
      ownerName: playlist.user.name ?? "Vibe Banger",
    },
    first ? resolveTrackCoverUrl(first, "large") : null
  );
}
