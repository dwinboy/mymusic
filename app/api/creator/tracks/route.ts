import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/creator-guard";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Statuses as a creator sees them, derived from the underlying fields. */
const STATUS_FILTERS: Record<string, Prisma.TrackWhereInput> = {
  published: { isPublished: true },
  review: { moderationStatus: "PENDING_REVIEW" },
  processing: { processingStatus: { in: ["UPLOADING", "PROCESSING"] } },
  failed: { OR: [{ processingStatus: "FAILED" }, { moderationStatus: "REJECTED" }] },
  drafts: { isPublished: false, moderationStatus: { in: ["NONE", "REJECTED"] }, processingStatus: "READY" },
  unpublished: { isPublished: false, moderationStatus: "APPROVED" },
};

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";
  const artistId = searchParams.get("artistId");

  const tracks = await db.track.findMany({
    where: {
      // Scoped to the caller inside the query — never trusts the artistId alone.
      artist: { ownerId: user.userId },
      ...(artistId ? { artistId } : {}),
      ...(STATUS_FILTERS[status] ?? {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { artist: { select: { name: true, slug: true } }, album: { select: { title: true } } },
  });

  return NextResponse.json({ tracks });
}
