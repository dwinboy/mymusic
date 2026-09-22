import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const [users, adminCount] = await Promise.all([
    db.user.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        image: true,
        _count: {
          select: { playlists: true, favorites: true, creatorProfiles: true, songRequests: true },
        },
      },
    }),
    // Platform-wide, independent of any search filter above — the client
    // needs the real count to know whether demoting one more admin would
    // leave the platform with none, not the count within whatever's
    // currently searched.
    db.user.count({ where: { role: "ADMIN" } }),
  ]);

  return NextResponse.json({ users, adminCount });
}
