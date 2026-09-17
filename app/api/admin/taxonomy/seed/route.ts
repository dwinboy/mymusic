import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { seedTaxonomy } from "@/prisma/taxonomy-seed";

/**
 * Installs the canonical starting taxonomy. An HTTP endpoint rather than only
 * a script so it can be run against a deployment whose database isn't
 * reachable from outside its private network.
 *
 * Defaults to "insert-missing", which adds absent terms without touching any
 * an admin has since edited. "refresh" rewrites names and descriptions from
 * the seed data and is meant for first-time setup only.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const mode = body?.mode === "refresh" ? "refresh" : "insert-missing";

  const result = await seedTaxonomy(db, mode);
  const byKind = await db.taxonomyTerm.groupBy({ by: ["kind"], _count: { _all: true } });

  return NextResponse.json({
    mode,
    ...result,
    totals: Object.fromEntries(byKind.map((r) => [r.kind, r._count._all])),
  });
}
