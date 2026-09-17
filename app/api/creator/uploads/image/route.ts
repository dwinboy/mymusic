import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/creator-guard";
import { createImageUploadSignature, isImageCloudinaryEnabled } from "@/lib/media/image-service";

/**
 * Signs a direct browser → Cloudinary upload for a creator. The folder is
 * decided here, not by the client, and it's part of what gets signed — so an
 * upload can only land in the caller's own folder, and routes accepting an
 * image id can verify ownership from its prefix.
 *
 * Requires owning a creator profile, so signing in alone doesn't turn the
 * platform's Cloudinary account into free image hosting.
 */
export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const isCreator = await db.artist.count({ where: { ownerId: user.userId } });
  if (!isCreator) return NextResponse.json({ error: "Create a creator profile first." }, { status: 403 });

  if (!isImageCloudinaryEnabled()) {
    return NextResponse.json({ error: "Image uploads aren't configured." }, { status: 503 });
  }

  return NextResponse.json(await createImageUploadSignature(`vibebanger/creators/${user.userId}`));
}
