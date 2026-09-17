import { getTrackBySlug } from "@/lib/queries";
import { resolveTrackCoverUrl } from "@/lib/media/entity-images";
import { songStoryCard } from "@/lib/share-images";

/** A 1080×1920 image of the song for sharing to Instagram Stories (and other story formats). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) return new Response("Not found", { status: 404 });
  return songStoryCard(track, resolveTrackCoverUrl(track, "large"));
}
