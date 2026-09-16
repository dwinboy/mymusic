import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toSlug } from "@/lib/slug";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ playlists: [] });

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");

  const playlists = await db.playlist.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tracks: true } },
      tracks: trackId ? { where: { trackId }, select: { trackId: true } } : false,
    },
  });

  return NextResponse.json({
    playlists: playlists.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      coverUrl: p.coverUrl,
      trackCount: p._count.tracks,
      containsTrack: trackId ? p.tracks.length > 0 : undefined,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await request.json();
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "A playlist title is required." }, { status: 400 });
  }

  const base = toSlug(title) || "playlist";
  let slug = base;
  let attempt = 1;
  while (await db.playlist.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  const playlist = await db.playlist.create({
    data: { title: title.trim(), slug, userId: session.user.id },
  });

  return NextResponse.json({ playlist }, { status: 201 });
}
