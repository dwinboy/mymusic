import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import type { TaxonomyKind } from "@/lib/generated/prisma/client";

export const TAXONOMY_KINDS: TaxonomyKind[] = ["GENRE", "MOOD", "ACTIVITY", "OCCASION", "INSTRUMENT", "LANGUAGE", "VOCAL", "TAG"];

const TERM_FIELDS = {
  id: true,
  kind: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  imagePublicId: true,
  parentId: true,
  displayOrder: true,
  isActive: true,
  isFeatured: true,
  _count: { select: { tracks: true, children: true } },
} as const;

/** Every term of one kind, parents and their sub-terms, in display order. */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kind = new URL(request.url).searchParams.get("kind") as TaxonomyKind | null;
  if (!kind || !TAXONOMY_KINDS.includes(kind)) return NextResponse.json({ error: "Unknown kind" }, { status: 400 });

  const terms = await db.taxonomyTerm.findMany({
    where: { kind },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: TERM_FIELDS,
  });
  return NextResponse.json({ terms });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const kind = body?.kind as TaxonomyKind;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!TAXONOMY_KINDS.includes(kind)) return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Name must be 2–60 characters." }, { status: 400 });

  // A sub-term belongs to a parent of the same kind — no mood under a genre.
  let parentId: string | null = null;
  if (typeof body?.parentId === "string" && body.parentId) {
    const parent = await db.taxonomyTerm.findFirst({ where: { id: body.parentId, kind }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: "Choose a parent of the same kind." }, { status: 400 });
    parentId = parent.id;
  }

  const slug = await uniqueSlug(name, async (s) => !!(await db.taxonomyTerm.findUnique({ where: { kind_slug: { kind, slug: s } } })));
  const last = await db.taxonomyTerm.findFirst({ where: { kind, parentId }, orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });

  const term = await db.taxonomyTerm.create({
    data: {
      kind,
      name,
      slug,
      parentId,
      description: typeof body?.description === "string" && body.description.trim() ? body.description.trim().slice(0, 2000) : null,
      displayOrder: (last?.displayOrder ?? 0) + 1,
    },
    select: TERM_FIELDS,
  });
  revalidateTag("taxonomy", { expire: 0 });
  return NextResponse.json({ term }, { status: 201 });
}
