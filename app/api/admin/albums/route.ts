import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { uploadImageLocally } from "@/lib/media/image-service";
import { productionLocalStorageWarning } from "@/lib/media/production-guard";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId");

  const albums = await db.album.findMany({
    where: artistId ? { artistId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { artist: true, _count: { select: { tracks: true } } },
  });

  return NextResponse.json({ albums });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const artistId = String(formData.get("artistId") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const releaseDateRaw = formData.get("releaseDate");
  const isPublished = formData.get("isPublished") === "true";
  const isFeatured = formData.get("isFeatured") === "true";

  if (!title || !artistId) {
    return NextResponse.json({ error: "Title and artist are required" }, { status: 400 });
  }

  const artist = await db.artist.findUnique({ where: { id: artistId } });
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  const slug = await uniqueSlug(title, async (s) => !!(await db.album.findUnique({ where: { slug: s } })));

  let coverUrl: string | null = null;
  let coverImagePublicId: string | null = null;

  if (formData.has("coverImagePublicId")) {
    coverImagePublicId = String(formData.get("coverImagePublicId") ?? "") || null;
    coverUrl = String(formData.get("coverImageUrl") ?? "") || null;
  } else {
    const coverFile = formData.get("cover") as File | null;
    if (coverFile && coverFile.size > 0) {
      const prodWarning = productionLocalStorageWarning("image");
      if (prodWarning) return NextResponse.json({ error: prodWarning }, { status: 500 });

      const { url } = await uploadImageLocally({
        folder: "covers",
        filename: `${slug}-${Date.now()}.jpg`,
        contentType: coverFile.type || "image/jpeg",
        data: Buffer.from(await coverFile.arrayBuffer()),
      });
      coverUrl = url;
    }
  }

  const album = await db.album.create({
    data: {
      title,
      slug,
      artistId,
      description,
      coverUrl,
      coverImagePublicId,
      releaseDate: releaseDateRaw ? new Date(String(releaseDateRaw)) : null,
      isPublished,
      isFeatured,
    },
  });

  return NextResponse.json({ album }, { status: 201 });
}
