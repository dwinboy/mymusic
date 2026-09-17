import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireOwnedArtist } from "@/lib/creator-guard";
import { uniqueSlug } from "@/lib/slug";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const artistId = new URL(request.url).searchParams.get("artistId");
  const albums = await db.album.findMany({
    where: { artist: { ownerId: user.userId }, ...(artistId ? { artistId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tracks: true } } },
  });
  return NextResponse.json({ albums });
}

/**
 * Creates an album on one of the caller's profiles. It starts unpublished and
 * goes live alongside the first of its tracks an admin approves.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const owned = await requireOwnedArtist(typeof body?.artistId === "string" ? body.artistId : "");
  if (!owned) return NextResponse.json({ error: "Choose one of your creator profiles." }, { status: 403 });

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "An album needs a title." }, { status: 400 });

  const slug = await uniqueSlug(title, async (s) => !!(await db.album.findUnique({ where: { slug: s } })));
  const album = await db.album.create({
    data: {
      title: title.slice(0, 120),
      slug,
      artistId: owned.artist.id,
      description: typeof body?.description === "string" && body.description.trim() ? body.description.trim().slice(0, 2000) : null,
      isPublished: false,
    },
  });
  return NextResponse.json({ album }, { status: 201 });
}
