import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { deleteCloudinaryImage } from "@/lib/media/image-service";

const KINDS = ["USER", "EDITORIAL", "ALGORITHMIC"] as const;

/** Curation controls: visibility, featuring, artwork, description and kind. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.playlist.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 120);
  if ("description" in body) {
    data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 2000) : null;
  }
  for (const flag of ["isPublic", "isFeatured"]) {
    if (typeof body[flag] === "boolean") data[flag] = body[flag];
  }
  if (typeof body.kind === "string" && KINDS.includes(body.kind as (typeof KINDS)[number])) data.kind = body.kind;
  if (typeof body.coverImagePublicId === "string" && typeof body.coverUrl === "string") {
    if (existing.coverImagePublicId && existing.coverImagePublicId !== body.coverImagePublicId) {
      await deleteCloudinaryImage(existing.coverImagePublicId);
    }
    data.coverImagePublicId = body.coverImagePublicId;
    data.coverUrl = body.coverUrl;
  }

  const playlist = await db.playlist.update({ where: { id }, data, include: { user: true, _count: { select: { tracks: true } } } });
  return NextResponse.json({ playlist });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.playlist.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
