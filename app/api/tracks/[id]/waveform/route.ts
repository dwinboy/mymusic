import { NextResponse } from "next/server";
import { getOrComputeWaveform } from "@/lib/media/waveform";

/**
 * Loudness peaks for drawing a published track's waveform. Computed and saved
 * on first request if the track predates waveforms.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const peaks = await getOrComputeWaveform(id);
    if (peaks === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { peaks },
      // Peaks only change if the audio is replaced, which creates new processing.
      { headers: { "Cache-Control": peaks.length ? "public, max-age=86400, stale-while-revalidate=604800" : "no-store" } }
    );
  } catch {
    // A waveform is decoration: the player falls back to a plain seek bar.
    return NextResponse.json({ peaks: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
