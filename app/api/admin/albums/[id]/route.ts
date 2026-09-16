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
  const existing = await db.album.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const data: Record<string, unknown> = {};

  const title = formData.get("title");
  if (typeof title === "string" && title.trim().length > 0) {
    data.title = title.trim();
    if (data.title !== existing.title) {
      data.slug = await uniqueSlug(data.title as string, async (s) => {
        if (s === existing.slug) return false;
        return !!(await db.album.findUnique({ where: { slug: s } }));
      });
    }
  }

  const description = formData.get("description");
  if (typeof description === "string") data.description = description.trim() || null;

  const releaseDate = formData.get("releaseDate");
  if (typeof releaseDate === "string" && releaseDate) data.releaseDate = new Date(releaseDate);

  if (formData.has("isPublished")) data.isPublished = formData.get("isPublished") === "true";
  if (formData.has("isFeatured")) data.isFeatured = formData.get("isFeatured") === "true";

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
        filename: `${id}-${Date.now()}.jpg`,
        contentType: coverFile.type || "image/jpeg",
        data: Buffer.from(await coverFile.arrayBuffer()),
      });
      data.coverUrl = url;
    }
  }

  const album = await db.album.update({ where: { id }, data });
  return NextResponse.json({ album });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const album = await db.album.findUnique({ where: { id } });

  if (album?.coverImagePublicId) {
    const sharedCount = await db.track.count({ where: { coverImagePublicId: album.coverImagePublicId } });
    if (sharedCount === 0) await deleteCloudinaryImage(album.coverImagePublicId);
  }

  await db.album.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
