import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ history: [] });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 12, 50);

  const history = await db.listeningHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { playedAt: "desc" },
    take: limit,
    distinct: ["trackId"],
    include: { track: { include: { artist: true, album: true } } },
  });

  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ recorded: false });

  const { trackId, progressSeconds } = await request.json();
  if (typeof trackId !== "string") {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  await db.listeningHistory.create({
    data: {
      userId: session.user.id,
      trackId,
      progressSeconds: typeof progressSeconds === "number" ? Math.round(progressSeconds) : 0,
    },
  });

  return NextResponse.json({ recorded: true });
}
