import type { PrismaClient, TaxonomyKind } from "@/lib/generated/prisma/client";
import { TAXONOMY, type TermSeed } from "./taxonomy-data";

/**
 * Idempotent: every term is upserted on its (kind, slug) identity, so this is
 * safe to run repeatedly and against a database that already holds terms —
 * including production.
 *
 * Two modes:
 *  - "refresh" (default, for development and first-time setup) rewrites name,
 *    description, ordering and hierarchy from the seed data.
 *  - "insert-missing" only adds terms that don't exist yet and never touches
 *    existing rows — safe once admins have edited the taxonomy.
 *
 * Either way `isActive`, `isFeatured` and artwork are only set on creation,
 * so re-seeding never undoes an admin hiding or re-featuring a term.
 */
export async function seedTaxonomy(db: PrismaClient, mode: "refresh" | "insert-missing" = "refresh") {
  let created = 0;
  let updated = 0;

  async function upsertTerm(kind: TaxonomyKind, seed: TermSeed, order: number, parentId: string | null) {
    const existing = await db.taxonomyTerm.findUnique({
      where: { kind_slug: { kind, slug: seed.slug } },
      select: { id: true },
    });

    if (existing && mode === "insert-missing") {
      for (const [i, child] of (seed.children ?? []).entries()) {
        await upsertTerm(kind, child, i, existing.id);
      }
      return;
    }

    const term = await db.taxonomyTerm.upsert({
      where: { kind_slug: { kind, slug: seed.slug } },
      create: {
        kind,
        slug: seed.slug,
        name: seed.name,
        description: seed.description ?? null,
        displayOrder: order,
        isFeatured: seed.isFeatured ?? false,
        parentId,
      },
      update: { name: seed.name, description: seed.description ?? null, displayOrder: order, parentId },
    });

    if (existing) updated += 1;
    else created += 1;

    for (const [i, child] of (seed.children ?? []).entries()) {
      await upsertTerm(kind, child, i, term.id);
    }
  }

  for (const [kind, terms] of Object.entries(TAXONOMY) as [TaxonomyKind, TermSeed[]][]) {
    for (const [i, seed] of terms.entries()) {
      await upsertTerm(kind, seed, i, null);
    }
  }

  return { created, updated };
}
