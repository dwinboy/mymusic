import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createImageUploadSignature, isImageCloudinaryEnabled } from "@/lib/media/image-service";

/**
 * Hands the browser everything it needs to POST an image straight to
 * Cloudinary — the file itself never touches our server. Only reachable
 * when IMAGE_PROVIDER=cloudinary; local dev keeps uploading covers through
 * the existing multipart form field instead (see admin track/artist routes).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isImageCloudinaryEnabled()) {
    return NextResponse.json({ error: "Cloudinary is not enabled (IMAGE_PROVIDER=cloudinary)." }, { status: 400 });
  }

  const { folder } = await request.json().catch(() => ({ folder: "vibebanger/covers" }));
  const signature = await createImageUploadSignature(folder || "vibebanger/covers");

  return NextResponse.json(signature);
}
