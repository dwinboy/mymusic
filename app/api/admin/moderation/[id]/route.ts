import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { validateForSubmission } from "@/lib/tracks/submission";

/**
 * Approve or reject a creator submission.
 *
 * Approving is what publishes the track. Validation runs again at approval
 * time rather than trusting that it passed on submission: the creator may
 * have edited since.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  const track = await db.track.findUnique({ where: { id }, include: { album: true } });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (track.moderationStatus !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "This track isn't awaiting review." }, { status: 409 });
  }

  const reviewed = { reviewedAt: new Date(), reviewedBy: admin.user!.id };

  if (action === "approve") {
    const problems = await validateForSubmission(id);
    if (problems.length > 0) {
      return NextResponse.json({ error: "This track no longer meets the publishing requirements.", problems }, { status: 422 });
    }

    const updated = await db.$transaction(async (tx) => {
      // A creator's album goes live with the first approved track in it —
      // the reviewer has just seen its title and artwork alongside the track.
      if (track.album && !track.album.isPublished) {
        await tx.album.update({ where: { id: track.album.id }, data: { isPublished: true } });
      }
      return tx.track.update({
        where: { id },
        data: { ...reviewed, moderationStatus: "APPROVED", moderationNote: null, isPublished: true },
      });
    });
    return NextResponse.json({ track: updated });
  }

  if (action === "reject") {
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    // A rejection without a reason leaves the creator nothing to act on.
    if (note.length < 5) {
      return NextResponse.json({ error: "Give the creator a reason so they can fix it." }, { status: 400 });
    }
    const updated = await db.track.update({
      where: { id },
      data: { ...reviewed, moderationStatus: "REJECTED", moderationNote: note.slice(0, 2000), isPublished: false },
    });
    return NextResponse.json({ track: updated });
  }

  return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
}
