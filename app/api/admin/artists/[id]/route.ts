import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { deleteCloudinaryImage, uploadImageLocally } from "@/lib/media/image-service";
import { productionLocalStorageWarning } from "@/lib/media/production-guard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.artist.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const data: Record<string, unknown> = {};

  const name = formData.get("name");
  if (typeof name === "string" && name.trim().length > 0) {
    data.name = name.trim();
    if (data.name !== existing.name) {
      data.slug = await uniqueSlug(data.name as string, async (s) => {
        if (s === existing.slug) return false;
        return !!(await db.artist.findUnique({ where: { slug: s } }));
      });
    }
  }

  const bio = formData.get("bio");
  if (typeof bio === "string") data.bio = bio.trim() || null;

  if (formData.has("isFeatured")) data.isFeatured = formData.get("isFeatured") === "true";

  // Avatar: Cloudinary mode sends a reference (already uploaded directly from
  // the browser); local mode sends the raw file, same as before.
  if (formData.has("avatarImagePublicId")) {
    const publicId = String(formData.get("avatarImagePublicId") ?? "");
    if (existing.avatarImagePublicId && existing.avatarImagePublicId !== publicId) {
      await deleteCloudinaryImage(existing.avatarImagePublicId);
    }
    data.avatarImagePublicId = publicId;
    data.avatarUrl = String(formData.get("avatarImageUrl") ?? "");
  } else {
    const avatarFile = formData.get("avatar") as File | null;
    if (avatarFile && avatarFile.size > 0) {
      const prodWarning = productionLocalStorageWarning("image");
      if (prodWarning) return NextResponse.json({ error: prodWarning }, { status: 500 });

      const { url } = await uploadImageLocally({
        folder: "avatars",
        filename: `${id}-${Date.now()}.jpg`,
        contentType: avatarFile.type || "image/jpeg",
        data: Buffer.from(await avatarFile.arrayBuffer()),
      });
      data.avatarUrl = url;
    }
  }

  // Cover: the wide banner image shown behind the avatar on the artist page.
  if (formData.has("coverImagePublicId")) {
    const publicId = String(formData.get("coverImagePublicId") ?? "");
    if (existing.coverImagePublicId && existing.coverImagePublicId !== publicId) {
      await deleteCloudinaryImage(existing.coverImagePublicId);
    }
    data.coverImagePublicId = publicId;
    data.coverUrl = String(formData.get("coverImageUrl") ?? "");
  } else {
    const coverFile = formData.get("cover") as File | null;
    if (coverFile && coverFile.size > 0) {
      const prodWarning = productionLocalStorageWarning("image");
      if (prodWarning) return NextResponse.json({ error: prodWarning }, { status: 500 });

      const { url } = await uploadImageLocally({
        folder: "covers",
        filename: `${id}-cover-${Date.now()}.jpg`,
        contentType: coverFile.type || "image/jpeg",
        data: Buffer.from(await coverFile.arrayBuffer()),
      });
      data.coverUrl = url;
    }
  }

  const artist = await db.artist.update({ where: { id }, data });
  return NextResponse.json({ artist });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const trackCount = await db.track.count({ where: { artistId: id } });
  if (trackCount > 0) {
    return NextResponse.json(
      { error: "This artist still has tracks. Delete or reassign their tracks first." },
      { status: 409 }
    );
  }

  const artist = await db.artist.findUnique({ where: { id } });
  if (artist?.avatarImagePublicId) await deleteCloudinaryImage(artist.avatarImagePublicId);
  if (artist?.coverImagePublicId && artist.coverImagePublicId !== artist.avatarImagePublicId) {
    await deleteCloudinaryImage(artist.coverImagePublicId);
  }

  await db.artist.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
