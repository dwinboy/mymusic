import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";

// Genres are TaxonomyTerm rows of kind GENRE. This route keeps the response
// shape the existing genres manager expects; /api/admin/taxonomy is the
// general-purpose replacement across every kind.

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const genres = await db.taxonomyTerm.findMany({
    where: { kind: "GENRE", parentId: null },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { tracks: true } } },
  });

  return NextResponse.json({ genres });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = await uniqueSlug(name, async (s) =>
    !!(await db.taxonomyTerm.findUnique({ where: { kind_slug: { kind: "GENRE", slug: s } } }))
  );
  const genre = await db.taxonomyTerm.create({ data: { kind: "GENRE", name: name.trim(), slug } });

  return NextResponse.json({ genre }, { status: 201 });
}
