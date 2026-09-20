import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { OPEN_STATUSES } from "@/lib/song-requests/status";
import type { SongRequestStatus } from "@/lib/generated/prisma/client";

const ALL_STATUSES: SongRequestStatus[] = [
  "SUBMITTED",
  "QUOTED",
  "ACCEPTED",
  "IN_PRODUCTION",
  "DELIVERED",
  "DECLINED",
  "CANCELLED",
];

/**
 * The commission queue.
 *
 * Ordered by deadline first, nulls last: a request needed on Saturday matters
 * more than one submitted earlier with no date on it. Postgres sorts NULLs
 * first on ASC, hence the explicit nulls: "last".
 */
export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("status");

  const where =
    filter === "all"
      ? {}
      : filter && ALL_STATUSES.includes(filter as SongRequestStatus)
        ? { status: filter as SongRequestStatus }
        : { status: { in: OPEN_STATUSES } };

  const [requests, counts] = await Promise.all([
    db.songRequest.findMany({
      where,
      orderBy: [{ neededBy: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: 200,
      select: {
        id: true,
        reference: true,
        status: true,
        occasionNote: true,
        occasionTerm: { select: { name: true } },
        recipientName: true,
        relationship: true,
        neededBy: true,
        createdAt: true,
        priceAmount: true,
        priceCurrency: true,
        quoteAcceptedAt: true,
        publishConsent: true,
        user: { select: { id: true, name: true, email: true } },
        deliveredTrack: { select: { id: true, title: true, slug: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.songRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    requests,
    counts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
  });
}
