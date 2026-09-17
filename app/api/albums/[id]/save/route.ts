import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PUBLIC_ALBUM_WHERE } from "@/lib/public-scope";

type Params = { params: Promise<{ id: string }> };

/** Saves an album to the listener's library. */
export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to save albums." }, { status: 401 });

  const { id } = await params;
  const album = await db.album.findFirst({ where: { id, ...PUBLIC_ALBUM_WHERE }, select: { id: true } });
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.savedAlbum.upsert({
    where: { userId_albumId: { userId, albumId: album.id } },
    create: { userId, albumId: album.id },
    update: {},
  });
  return NextResponse.json({ saved: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to save albums." }, { status: 401 });

  const { id } = await params;
  await db.savedAlbum.deleteMany({ where: { userId, albumId: id } });
  return NextResponse.json({ saved: false });
}
