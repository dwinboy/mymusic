import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const playlists = await db.playlist.findMany({
    orderBy: { updatedAt: "desc" },
    include: { user: true, _count: { select: { tracks: true } } },
  });

  return NextResponse.json({ playlists });
}
