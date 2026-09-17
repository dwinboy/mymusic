import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PUBLIC_ARTIST_WHERE } from "@/lib/public-scope";

type Params = { params: Promise<{ id: string }> };

async function requireListener() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Follow a creator. Only creators with published music can be followed. */
export async function POST(_request: Request, { params }: Params) {
  const userId = await requireListener();
  if (!userId) return NextResponse.json({ error: "Sign in to follow creators." }, { status: 401 });

  const { id } = await params;
  const artist = await db.artist.findFirst({ where: { id, ...PUBLIC_ARTIST_WHERE }, select: { id: true } });
  if (!artist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.follow.upsert({
    where: { userId_artistId: { userId, artistId: artist.id } },
    create: { userId, artistId: artist.id },
    update: {},
  });
  const followers = await db.follow.count({ where: { artistId: artist.id } });
  return NextResponse.json({ following: true, followers });
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireListener();
  if (!userId) return NextResponse.json({ error: "Sign in to follow creators." }, { status: 401 });

  const { id } = await params;
  await db.follow.deleteMany({ where: { userId, artistId: id } });
  const followers = await db.follow.count({ where: { artistId: id } });
  return NextResponse.json({ following: false, followers });
}
