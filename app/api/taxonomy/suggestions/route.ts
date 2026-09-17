import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getIntersections, type TaxonomyKind } from "@/lib/taxonomy";

/**
 * Classification suggestions from the catalogue itself: given a track's
 * genres, what other published music in those genres is most often tagged
 * with. Presented to creators as suggestions to accept, edit or ignore —
 * never applied on their behalf.
 *
 * Deliberately rule-based: this is the seam where audio analysis can later
 * slot in, returning the same shape.
 */
const SUGGESTED_KINDS: TaxonomyKind[] = ["MOOD", "ACTIVITY", "OCCASION", "VOCAL", "INSTRUMENT"];

export async function GET(request: Request) {
  const genreIds = new URL(request.url).searchParams.getAll("genre").flatMap((g) => g.split(",")).filter(Boolean);
  if (genreIds.length === 0) return NextResponse.json({ suggestions: {} });

  const valid = await db.taxonomyTerm.findMany({
    where: { id: { in: genreIds }, kind: "GENRE", isActive: true },
    select: { id: true },
  });
  if (valid.length === 0) return NextResponse.json({ suggestions: {} });

  const perKind = await Promise.all(
    SUGGESTED_KINDS.map(async (kind) => {
      const found = await getIntersections(
        valid.map((g) => g.id),
        "GENRE",
        { kinds: [kind], limit: kind === "VOCAL" ? 1 : 4, minTracks: 1 }
      );
      return [kind, found.map(({ term, trackCount }) => ({ id: term.id, name: term.name, slug: term.slug, trackCount }))] as const;
    })
  );

  return NextResponse.json({ suggestions: Object.fromEntries(perKind.filter(([, list]) => list.length > 0)) });
}
