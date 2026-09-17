import type { PrismaClient, TaxonomyKind } from "@/lib/generated/prisma/client";
import { TAXONOMY, type TermSeed } from "./taxonomy-data";

/**
 * Idempotent: every term is upserted on its (kind, slug) identity, so this is
 * safe to run repeatedly and against a database that already holds terms —
 * including production.
 *
 * Re-running refreshes name, description, ordering and hierarchy from the seed
 * data, but leaves admin-owned state alone: `isActive`, `isFeatured` and
 * artwork are only set on first creation, so re-seeding never undoes an
 * admin's decision to hide or re-feature a term.
 */
export async function seedTaxonomy(db: PrismaClient) {
  let created = 0;
  let updated = 0;

  async function upsertTerm(kind: TaxonomyKind, seed: TermSeed, order: number, parentId: string | null) {
    const existing = await db.taxonomyTerm.findUnique({
      where: { kind_slug: { kind, slug: seed.slug } },
      select: { id: true },
    });

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
