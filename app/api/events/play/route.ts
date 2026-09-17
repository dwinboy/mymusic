import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Listening signal pipeline. Anonymous listeners are included — they're most
 * of the audience, and excluding them made every play count zero. Identity is
 * a random client-generated session id, never anything personal.
 *
 *   POST  { trackId, sessionId }                 -> start a play, returns playId
 *   PATCH { playId, progressSeconds, completed } -> report progress
 *
 * A play is *counted* (and `track.playCount` incremented) once the listener
 * reaches min(30s, half the track) — the usual streaming threshold, so
 * skipping through a queue doesn't inflate numbers. Anything below that stays
 * as an uncounted row, which is the skip signal.
 */

const COUNT_THRESHOLD_SECONDS = 30;
/** Network and timer jitter allowance on the wall-clock check below. */
const CLOCK_TOLERANCE_SECONDS = 3;
const SESSION_ID = /^[a-zA-Z0-9_-]{8,64}$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const trackId = typeof body?.trackId === "string" ? body.trackId : null;
  const sessionId = typeof body?.sessionId === "string" && SESSION_ID.test(body.sessionId) ? body.sessionId : null;
  if (!trackId) return NextResponse.json({ error: "trackId is required" }, { status: 400 });

  const track = await db.track.findFirst({
    where: { id: trackId, isPublished: true },
    select: { id: true },
  });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const play = await db.play.create({
    data: { trackId, userId, sessionId },
    select: { id: true },
  });

  // Signed-in listeners also get a history entry, which powers Continue
  // Listening. Previously a separate request; folded in here.
  if (userId) {
    await db.listeningHistory.create({ data: { userId, trackId } });
  }

  return NextResponse.json({ playId: play.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const playId = typeof body?.playId === "string" ? body.playId : null;
  if (!playId) return NextResponse.json({ error: "playId is required" }, { status: 400 });

  const play = await db.play.findUnique({
    where: { id: playId },
    select: { id: true, trackId: true, createdAt: true, countedAsPlay: true, track: { select: { duration: true } } },
  });
  if (!play) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const duration = play.track.duration;
  const reported = Number(body.progressSeconds);
  // Clamp to the track's length: a reported position past the end is noise.
  const progressSeconds = Number.isFinite(reported)
    ? Math.max(0, Math.min(Math.round(reported), duration > 0 ? duration : Math.round(reported)))
    : 0;
  const completed = body.completed === true;

  await db.play.update({
    where: { id: playId },
    data: { progressSeconds, ...(completed ? { completed: true } : {}) },
  });

  if (!play.countedAsPlay) {
    const threshold = duration > 0 ? Math.min(COUNT_THRESHOLD_SECONDS, duration / 2) : COUNT_THRESHOLD_SECONDS;
    const elapsedWallClock = (Date.now() - play.createdAt.getTime()) / 1000;

    // Both must hold: the position reached the threshold AND that much real
    // time has actually passed since the play started. The second check is
    // what stops a client claiming 30 seconds of listening one second in.
    const reachedThreshold = progressSeconds >= threshold || completed;
    const genuinelyListened = elapsedWallClock + CLOCK_TOLERANCE_SECONDS >= threshold;

    if (reachedThreshold && genuinelyListened) {
      // Conditional update is the idempotency guard: a retried or concurrent
      // request finds countedAsPlay already true, matches zero rows, and
      // never increments twice.
      const marked = await db.play.updateMany({
        where: { id: playId, countedAsPlay: false },
        data: { countedAsPlay: true },
      });
      if (marked.count === 1) {
        await db.track.update({ where: { id: play.trackId }, data: { playCount: { increment: 1 } } });
      }
      return NextResponse.json({ counted: marked.count === 1 });
    }
  }

  return NextResponse.json({ counted: false });
}
