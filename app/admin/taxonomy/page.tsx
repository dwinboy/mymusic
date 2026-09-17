import Link from "next/link";
import { TaxonomyManager, type AdminTerm } from "@/components/admin/taxonomy-manager";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { TaxonomyKind } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Taxonomy" };

const KINDS = [
  { kind: "GENRE", label: "Genres" },
  { kind: "MOOD", label: "Moods" },
  { kind: "ACTIVITY", label: "Activities" },
  { kind: "OCCASION", label: "Occasions" },
  { kind: "INSTRUMENT", label: "Instruments" },
  { kind: "LANGUAGE", label: "Languages" },
  { kind: "VOCAL", label: "Vocals" },
  { kind: "TAG", label: "Tags" },
] as const;

export default async function AdminTaxonomyPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const active = KINDS.find((k) => k.kind === kind) ?? KINDS[0];

  const terms = (await db.taxonomyTerm.findMany({
    where: { kind: active.kind as TaxonomyKind },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
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
    },
  })) as AdminTerm[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Taxonomy</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        The vocabulary creators classify music with, and listeners browse by. Sub-terms sit under their parent — a filter
        for a parent includes everything beneath it.
      </p>

      <nav className="scrollbar-hidden -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Term kinds">
        {KINDS.map((k) => (
          <Link
            key={k.kind}
            href={`/admin/taxonomy?kind=${k.kind}`}
            aria-current={k.kind === active.kind ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full border px-4 text-sm transition-colors",
              k.kind === active.kind ? "border-foreground bg-foreground text-canvas" : "border-border-strong text-foreground-muted hover:text-foreground"
            )}
          >
            {k.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <TaxonomyManager key={active.kind} kind={active.kind} label={active.label} terms={terms} />
      </div>
    </div>
  );
}
