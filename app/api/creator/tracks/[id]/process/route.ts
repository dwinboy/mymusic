import { NextResponse } from "next/server";
import { requireOwnedTrack } from "@/lib/creator-guard";
import { processTrackAudio, PipelineError } from "@/lib/tracks/pipeline";

export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedTrack(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const track = await processTrackAudio(id);
    return NextResponse.json({ track });
  } catch (err) {
    if (err instanceof PipelineError) {
      return NextResponse.json({ error: err.message, ...(err.detail ? { detail: err.detail } : {}) }, { status: err.status });
    }
    throw err;
  }
}
