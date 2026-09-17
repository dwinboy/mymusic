import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { deleteCloudinaryImage } from "@/lib/media/image-service";

type Params = { params: Promise<{ id: string }> };

/**
 * Edits a term. The slug is deliberately not editable: it's the public URL
 * of a genre or mood page, and changing it breaks every link and share.
 */
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.taxonomyTerm.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Name must be 2–60 characters." }, { status: 400 });
    data.name = name;
  }
  if ("description" in body) {
    data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 2000) : null;
  }
  for (const flag of ["isActive", "isFeatured"]) {
    if (typeof body[flag] === "boolean") data[flag] = body[flag];
  }
  if (typeof body.displayOrder === "number" && Number.isFinite(body.displayOrder)) {
    data.displayOrder = Math.max(0, Math.round(body.displayOrder));
  }
  if ("parentId" in body) {
    if (!body.parentId) data.parentId = null;
    else {
      const parent = await db.taxonomyTerm.findFirst({ where: { id: body.parentId, kind: existing.kind }, select: { id: true, parentId: true } });
      // One level of nesting, and never its own parent.
      if (!parent || parent.id === id || parent.parentId) {
        return NextResponse.json({ error: "Choose a top-level term of the same kind as the parent." }, { status: 400 });
      }
      data.parentId = parent.id;
    }
  }
  if (typeof body.imagePublicId === "string" && typeof body.imageUrl === "string") {
    if (existing.imagePublicId && existing.imagePublicId !== body.imagePublicId) {
      await deleteCloudinaryImage(existing.imagePublicId);
    }
    data.imagePublicId = body.imagePublicId;
    data.imageUrl = body.imageUrl;
  }

  const term = await db.taxonomyTerm.update({ where: { id }, data });
  revalidateTag("taxonomy", { expire: 0 });
  return NextResponse.json({ term });
}

/**
 * Removes a term outright — only one nothing depends on. A term in use is
 * deactivated instead, which hides it from browsing and from creators while
 * leaving existing classifications intact.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const term = await db.taxonomyTerm.findUnique({ where: { id }, include: { _count: { select: { tracks: true, children: true } } } });
  if (!term) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (term._count.tracks > 0 || term._count.children > 0) {
    return NextResponse.json(
      { error: `“${term.name}” is in use by ${term._count.tracks} tracks and ${term._count.children} sub-terms. Deactivate it instead.` },
      { status: 409 }
    );
  }

  if (term.imagePublicId) await deleteCloudinaryImage(term.imagePublicId);
  await db.taxonomyTerm.delete({ where: { id } });
  revalidateTag("taxonomy", { expire: 0 });
  return NextResponse.json({ deleted: true });
}
