import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const published = searchParams.get("published");
  const featured = searchParams.get("featured");

  const where: Prisma.TrackWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { artist: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (published === "true") where.isPublished = true;
  if (published === "false") where.isPublished = false;
  if (featured === "true") where.isFeatured = true;

  const tracks = await db.track.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { artist: true, album: true },
  });

  return NextResponse.json({ tracks });
}

// Track creation now happens via POST /api/admin/tracks/draft (starts an
// upload) followed by PATCH /api/admin/tracks/[id] (fills in metadata) —
// see that route for why: audio bytes need to go straight to R2, not
// through this route's request body.
