import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnedTrack } from "@/lib/creator-guard";

/**
 * A creator can take their own track off the site, and put it back only if an
 * admin has approved its current content. Taking a track down never needs
 * permission; putting one up always does.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedTrack(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const publish = body?.published === true;

  if (publish) {
    if (owned.track.moderationStatus !== "APPROVED") {
      return NextResponse.json({ error: "Only approved tracks can be published." }, { status: 403 });
    }
    if (owned.track.processingStatus !== "READY") {
      return NextResponse.json({ error: "This track's audio isn't ready." }, { status: 400 });
    }
  }

  const track = await db.track.update({ where: { id }, data: { isPublished: publish } });
  return NextResponse.json({ track });
}
