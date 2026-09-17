import { getTrackBySlug } from "@/lib/queries";
import { resolveTrackCoverUrl } from "@/lib/media/entity-images";
import { songPreviewCard } from "@/lib/share-images";

/**
 * The link preview for a shared song, sized for the wide cards WhatsApp,
 * iMessage, X and Facebook show. See lib/share-images for why it's a JPEG.
 */

export const alt = "Song artwork, title and creator on Vibe Banger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) return new Response("Not found", { status: 404 });
  return songPreviewCard(track, resolveTrackCoverUrl(track, "large"));
}
