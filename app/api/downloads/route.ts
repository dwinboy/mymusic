import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ downloads: [] });

  const downloads = await db.download.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { track: { include: { artist: true, album: true } } },
  });

  return NextResponse.json({
    downloads: downloads.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      track: toPlayerTrack(d.track),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId } = await request.json();
  if (typeof trackId !== "string") {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  const track = await db.track.findUnique({ where: { id: trackId } });
  if (!track || !track.downloadEnabled || !track.isPublished) {
    return NextResponse.json({ error: "This track is not available for download." }, { status: 403 });
  }

  await db.$transaction([
    db.download.upsert({
      where: { userId_trackId: { userId: session.user.id, trackId } },
      create: { userId: session.user.id, trackId },
      update: {},
    }),
    db.track.update({ where: { id: trackId }, data: { downloadCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ downloaded: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");

  if (trackId) {
    await db.download.deleteMany({ where: { userId: session.user.id, trackId } });
  } else {
    await db.download.deleteMany({ where: { userId: session.user.id } });
  }

  return NextResponse.json({ downloaded: false });
}
