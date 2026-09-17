import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnedArtist } from "@/lib/creator-guard";
import { deleteCloudinaryImage } from "@/lib/media/image-service";

/**
 * Edits a creator profile the caller owns. The slug is deliberately not
 * editable: it's the public URL, and changing it breaks every link and share.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedArtist(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data: Record<string, string | null> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: "Choose a creator name between 2 and 60 characters." }, { status: 400 });
    }
    data.name = name;
  }
  if ("bio" in body) data.bio = typeof body.bio === "string" && body.bio.trim() ? body.bio.trim().slice(0, 2000) : null;
  if ("location" in body) {
    data.location = typeof body.location === "string" && body.location.trim() ? body.location.trim().slice(0, 80) : null;
  }

  for (const [idField, urlField] of [
    ["avatarImagePublicId", "avatarUrl"],
    ["coverImagePublicId", "coverUrl"],
  ] as const) {
    if (typeof body[idField] !== "string" || typeof body[urlField] !== "string") continue;
    // Only accept images uploaded into this creator's own Cloudinary folder,
    // so a profile can't be pointed at someone else's asset.
    if (!body[idField].startsWith(`vibebanger/creators/${owned.userId}/`)) {
      return NextResponse.json({ error: "Invalid image." }, { status: 400 });
    }
    const previous = owned.artist[idField];
    if (previous && previous !== body[idField]) await deleteCloudinaryImage(previous);
    data[idField] = body[idField];
    data[urlField] = body[urlField];
  }

  const profile = await db.artist.update({ where: { id }, data });
  return NextResponse.json({ profile });
}
