import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnedTrack } from "@/lib/creator-guard";
import { validateForSubmission } from "@/lib/tracks/submission";
import { getSiteSettings } from "@/lib/settings";

/**
 * Publishes a finished track, or sends it to review when the platform is set
 * to moderate first. Validation runs server-side and returns every problem at
 * once; the publishing form checks the same rules, but this is the one that
 * counts — nothing goes live without meeting them.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedTrack(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = owned.track.moderationStatus;
  if (status === "PENDING_REVIEW") return NextResponse.json({ error: "This track is already awaiting review." }, { status: 409 });
  if (status === "APPROVED") return NextResponse.json({ error: "This track is already approved." }, { status: 409 });

  const problems = await validateForSubmission(id);
  if (problems.length > 0) {
    return NextResponse.json({ error: "This track isn't ready to submit yet.", problems }, { status: 422 });
  }

  const { autoPublish } = await getSiteSettings();
  const now = new Date();

  const track = await db.track.update({
    where: { id },
    data: autoPublish
      ? {
          // Approved by the rules rather than by a person, so reviewedBy stays
          // null — that is what marks it as automatic in the audit trail.
          moderationStatus: "APPROVED",
          isPublished: true,
          submittedAt: now,
          reviewedAt: now,
          moderationNote: null,
        }
      : { moderationStatus: "PENDING_REVIEW", submittedAt: now, moderationNote: null },
  });

  return NextResponse.json({ track, published: autoPublish });
}
