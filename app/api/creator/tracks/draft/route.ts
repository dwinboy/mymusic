import { NextResponse } from "next/server";
import { requireOwnedArtist } from "@/lib/creator-guard";
import { startTrackUpload, PipelineError } from "@/lib/tracks/pipeline";

/**
 * Starts an upload for a creator profile the caller owns. The track begins as
 * an unpublished draft; nothing reaches the public site without admin
 * approval.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const artistId = String(formData.get("artistId") ?? "");

  const owned = await requireOwnedArtist(artistId);
  if (!owned) return NextResponse.json({ error: "Choose one of your creator profiles." }, { status: 403 });

  try {
    const result = await startTrackUpload({
      artistId,
      title: String(formData.get("title") ?? ""),
      filename: String(formData.get("filename") ?? ""),
      contentType: String(formData.get("contentType") ?? ""),
      file: formData.get("audio") as File | null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PipelineError) {
      return NextResponse.json({ error: err.message, ...(err.detail ? { detail: err.detail } : {}) }, { status: err.status });
    }
    throw err;
  }
}
