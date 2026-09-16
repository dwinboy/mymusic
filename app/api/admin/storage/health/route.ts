import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { isAudioR2Enabled } from "@/lib/media/audio-service";
import { headObject } from "@/lib/media/r2-client";

interface HealthIssue {
  trackId: string;
  title: string;
  issue: string;
}

/**
 * A bounded, on-demand spot-check — not a full catalogue scan (that's the
 * "do not query every object on every dashboard page load" rule from the
 * storage-dashboard requirements). Checks the most recent 100 tracks:
 * DB-level consistency always, and an actual R2 HEAD request per key when
 * R2 is configured, to catch "database says READY but the object is gone".
 */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tracks = await db.track.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      processingStatus: true,
      audioUrl: true,
      streamingStorageKey: true,
      coverUrl: true,
      coverImagePublicId: true,
    },
  });

  const issues: HealthIssue[] = [];
  const r2Enabled = isAudioR2Enabled();

  for (const track of tracks) {
    if (track.processingStatus === "READY" && !track.streamingStorageKey && !track.audioUrl) {
      issues.push({ trackId: track.id, title: track.title, issue: "Marked READY but has no streaming audio reference." });
      continue;
    }
    if (track.processingStatus === "READY" && r2Enabled && track.streamingStorageKey) {
      const head = await headObject(track.streamingStorageKey).catch(() => "error" as const);
      if (head === null) {
        issues.push({ trackId: track.id, title: track.title, issue: `R2 object missing: ${track.streamingStorageKey}` });
      } else if (head === "error") {
        issues.push({ trackId: track.id, title: track.title, issue: "Couldn't verify R2 object (network/permission error)." });
      }
    }
    if (!track.coverUrl && !track.coverImagePublicId) {
      issues.push({ trackId: track.id, title: track.title, issue: "No artwork set." });
    }
  }

  return NextResponse.json({ checked: tracks.length, issues });
}
