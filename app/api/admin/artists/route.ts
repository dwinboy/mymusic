import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { uploadImageLocally } from "@/lib/media/image-service";
import { productionLocalStorageWarning } from "@/lib/media/production-guard";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const artists = await db.artist.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tracks: true, albums: true } } },
  });

  return NextResponse.json({ artists });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const isFeatured = formData.get("isFeatured") === "true";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = await uniqueSlug(name, async (s) => !!(await db.artist.findUnique({ where: { slug: s } })));

  let avatarUrl: string | null = null;
  let avatarImagePublicId: string | null = null;

  if (formData.has("avatarImagePublicId")) {
    avatarImagePublicId = String(formData.get("avatarImagePublicId") ?? "") || null;
    avatarUrl = String(formData.get("avatarImageUrl") ?? "") || null;
  } else {
    const avatarFile = formData.get("avatar") as File | null;
    if (avatarFile && avatarFile.size > 0) {
      const prodWarning = productionLocalStorageWarning("image");
      if (prodWarning) return NextResponse.json({ error: prodWarning }, { status: 500 });

      const { url } = await uploadImageLocally({
        folder: "avatars",
        filename: `${slug}-${Date.now()}.${extFromType(avatarFile.type)}`,
        contentType: avatarFile.type || "image/jpeg",
        data: Buffer.from(await avatarFile.arrayBuffer()),
      });
      avatarUrl = url;
    }
  }

  const artist = await db.artist.create({
    data: { name, slug, bio, isFeatured, avatarUrl, avatarImagePublicId },
  });

  return NextResponse.json({ artist }, { status: 201 });
}

function extFromType(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}
