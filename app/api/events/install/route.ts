import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const PLATFORMS = new Set(["android", "ios", "desktop", "other"]);

/**
 * Records a completed install — the browser's own one-tap dialog finishing,
 * or the iOS Share-sheet steps ending the same way. Fired once per install
 * event by the client, which guards its own duplicate `appinstalled` fires;
 * this just writes what it's told.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const platform = typeof body?.platform === "string" && PLATFORMS.has(body.platform) ? body.platform : "other";

  const session = await auth();

  await db.pwaInstall.create({
    data: { platform, userId: session?.user?.id ?? null },
  });

  return NextResponse.json({ recorded: true }, { status: 201 });
}
