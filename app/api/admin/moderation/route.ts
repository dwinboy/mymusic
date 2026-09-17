import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { TERM_SELECT } from "@/lib/taxonomy";
import { getStreamingUrl } from "@/lib/media/audio-service";

/** The review queue: creator submissions awaiting a decision, oldest first. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tracks = await db.track.findMany({
    where: { moderationStatus: "PENDING_REVIEW" },
    orderBy: { submittedAt: "asc" },
    take: 100,
    include: {
      artist: { include: { owner: { select: { email: true, name: true } } } },
      album: true,
      terms: { select: { isPrimary: true, term: { select: TERM_SELECT } } },
    },
  });

  // Reviewers need to hear the track, which isn't public yet, so its
  // streaming URL is included here rather than derived from public data.
  return NextResponse.json({ tracks: tracks.map((t) => ({ ...t, previewUrl: getStreamingUrl(t) })) });
}
