import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const playlists = await db.playlist.findMany({
    orderBy: [{ kind: "desc" }, { isFeatured: "desc" }, { updatedAt: "desc" }],
    include: { user: true, _count: { select: { tracks: true } } },
  });

  return NextResponse.json({ playlists });
}

/**
 * Creates an editorial playlist — a collection made by the platform, owned by
 * the admin who made it, so tracks can be added and reordered from its page
 * like any other playlist.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (title.length < 2 || title.length > 120) return NextResponse.json({ error: "Title must be 2–120 characters." }, { status: 400 });

  const slug = await uniqueSlug(title, async (s) => !!(await db.playlist.findUnique({ where: { slug: s } })));
  const playlist = await db.playlist.create({
    data: {
      title,
      slug,
      userId: admin.user.id,
      kind: "EDITORIAL",
      isPublic: true,
      description: typeof body?.description === "string" && body.description.trim() ? body.description.trim().slice(0, 2000) : null,
    },
    include: { user: true, _count: { select: { tracks: true } } },
  });
  return NextResponse.json({ playlist }, { status: 201 });
}
