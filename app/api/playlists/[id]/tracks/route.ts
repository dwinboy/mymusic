import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function assertOwnership(playlistId: string, userId: string) {
  const playlist = await db.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return null;
  return playlist;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playlist = await assertOwnership(id, session.user.id);
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { trackId } = await request.json();
  if (typeof trackId !== "string") {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  const lastTrack = await db.playlistTrack.findFirst({
    where: { playlistId: id },
    orderBy: { position: "desc" },
  });

  await db.playlistTrack.upsert({
    where: { playlistId_trackId: { playlistId: id, trackId } },
    create: { playlistId: id, trackId, position: (lastTrack?.position ?? -1) + 1 },
    update: {},
  });

  await db.playlist.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ added: true }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playlist = await assertOwnership(id, session.user.id);
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  if (!trackId) return NextResponse.json({ error: "trackId is required" }, { status: 400 });

  await db.playlistTrack.deleteMany({ where: { playlistId: id, trackId } });

  return NextResponse.json({ removed: true });
}

/**
 * Reorders the playlist. Takes the full list of track ids in the order they
 * should sit, rather than a from/to pair: a drag that crosses several rows
 * would otherwise need one request per row it passed, and any dropped request
 * would leave the order half-applied.
 *
 * Positions are rewritten in one transaction so the list is never briefly
 * missing an entry or holding two tracks at the same position.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playlist = await assertOwnership(id, session.user.id);
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const trackIds: unknown = body?.trackIds;
  if (!Array.isArray(trackIds) || trackIds.some((t) => typeof t !== "string")) {
    return NextResponse.json({ error: "trackIds must be a list of ids." }, { status: 400 });
  }

  const existing = await db.playlistTrack.findMany({
    where: { playlistId: id },
    select: { trackId: true },
  });

  // The order sent has to be exactly what's in the playlist. A list that has
  // gained or lost a track means the page was working from a stale copy, and
  // applying it would silently drop whatever it didn't know about.
  const sent = new Set(trackIds as string[]);
  if (sent.size !== trackIds.length || sent.size !== existing.length || existing.some((t) => !sent.has(t.trackId))) {
    return NextResponse.json({ error: "This playlist changed while you were reordering it. Reload and try again." }, { status: 409 });
  }

  await db.$transaction([
    ...(trackIds as string[]).map((trackId, position) =>
      db.playlistTrack.update({
        where: { playlistId_trackId: { playlistId: id, trackId } },
        data: { position },
      })
    ),
    db.playlist.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  return NextResponse.json({ reordered: true });
}
