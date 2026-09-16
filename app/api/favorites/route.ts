import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ trackIds: [] });

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    select: { trackId: true },
  });

  return NextResponse.json({ trackIds: favorites.map((f) => f.trackId) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId } = await request.json();
  if (typeof trackId !== "string") {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  await db.favorite.upsert({
    where: { userId_trackId: { userId: session.user.id, trackId } },
    create: { userId: session.user.id, trackId },
    update: {},
  });

  return NextResponse.json({ liked: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  if (!trackId) return NextResponse.json({ error: "trackId is required" }, { status: 400 });

  await db.favorite.deleteMany({ where: { userId: session.user.id, trackId } });

  return NextResponse.json({ liked: false });
}
