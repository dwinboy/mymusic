import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TaxonomyKind } from "@/lib/generated/prisma/client";

const KINDS: TaxonomyKind[] = ["GENRE", "MOOD", "ACTIVITY", "OCCASION", "INSTRUMENT", "LANGUAGE", "VOCAL", "TAG"];

/**
 * The controlled vocabulary creators classify tracks with. Only active terms
 * are exposed: creators pick from what admins have approved and can't invent
 * categories, which is what keeps "sleep" from fragmenting into ten variants.
 *
 *   GET /api/taxonomy            -> every kind
 *   GET /api/taxonomy?kind=MOOD  -> one kind
 */
export async function GET(request: Request) {
  const kindParam = new URL(request.url).searchParams.get("kind")?.toUpperCase() as TaxonomyKind | undefined;
  if (kindParam && !KINDS.includes(kindParam)) {
    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  }

  const terms = await db.taxonomyTerm.findMany({
    where: { isActive: true, ...(kindParam ? { kind: kindParam } : {}) },
    orderBy: [{ kind: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, kind: true, name: true, slug: true, description: true, parentId: true, isFeatured: true },
  });

  const grouped: Partial<Record<TaxonomyKind, typeof terms>> = {};
  for (const term of terms) (grouped[term.kind] ??= []).push(term);

  return NextResponse.json(
    { terms: grouped },
    // Changes only when an admin edits the taxonomy, so a short shared cache
    // is safe and keeps the upload form snappy.
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
