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
