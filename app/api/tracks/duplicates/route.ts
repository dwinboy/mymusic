import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireOwnedArtist } from "@/lib/creator-guard";
import { findDuplicateTracks } from "@/lib/tracks/duplicates";

/**
 * Whether this artist already has a track by this name, so the upload flow
 * can say so before a second copy reaches the catalogue.
 *
 * Only for someone who could see the answer anyway: the creator who owns the
 * profile, or an admin. Otherwise this would report on unpublished drafts to
 * anyone who asked.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId") ?? "";
  const title = searchParams.get("title") ?? "";
  const exclude = searchParams.get("exclude") ?? undefined;

  if (!artistId || title.trim().length < 2) return NextResponse.json({ duplicates: [] });

  const allowed = (await requireOwnedArtist(artistId)) ?? (await requireAdmin());
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const duplicates = await findDuplicateTracks(artistId, title, exclude);
  return NextResponse.json({
    duplicates: duplicates.map((track) => ({
      id: track.id,
      slug: track.slug,
      title: track.title,
      isPublished: track.isPublished,
    })),
  });
}
