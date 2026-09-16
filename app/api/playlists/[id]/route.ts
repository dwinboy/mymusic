import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function assertOwnership(playlistId: string, userId: string) {
  const playlist = await db.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return null;
  return playlist;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playlist = await assertOwnership(id, session.user.id);
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const data: { title?: string; description?: string; isPublic?: boolean } = {};
  if (typeof body.title === "string" && body.title.trim().length > 0) data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;

  const updated = await db.playlist.update({ where: { id }, data });
  return NextResponse.json({ playlist: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playlist = await assertOwnership(id, session.user.id);
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.playlist.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
