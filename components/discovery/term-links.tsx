import Link from "next/link";
import { termHref, type TaxonomyKind } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

interface LinkableTerm {
  id: string;
  kind: TaxonomyKind;
  name: string;
  slug: string;
}

/**
 * Taxonomy terms as links into discovery. Browsable kinds (genre, mood,
 * activity, occasion) link to their pages; filter-only kinds render as plain
 * labels, since they have no page to go to.
 */
export function TermChips({ terms, className }: { terms: LinkableTerm[]; className?: string }) {
  if (terms.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {terms.map((term) => {
        const href = termHref(term.kind, term.slug);
        const base = "inline-flex items-center rounded-full border border-border-strong px-3.5 py-1.5 text-sm";
        return href ? (
          <Link
            key={term.id}
            href={href}
            className={cn(base, "text-foreground transition-colors hover:border-foreground-subtle hover:bg-surface")}
          >
            {term.name}
          </Link>
        ) : (
          <span key={term.id} className={cn(base, "text-foreground-muted")}>
            {term.name}
          </span>
        );
      })}
    </div>
  );
}

/** Inline "Ambient · Dreamy · Instrumental" line under a title. */
export function TermLine({ terms, className }: { terms: LinkableTerm[]; className?: string }) {
  if (terms.length === 0) return null;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 text-sm text-foreground-muted", className)}>
      {terms.map((term, i) => {
        const href = termHref(term.kind, term.slug);
        return (
          <span key={term.id} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-foreground-subtle">·</span>}
            {href ? (
              <Link href={href} className="transition-colors hover:text-foreground">
                {term.name}
              </Link>
            ) : (
              <span>{term.name}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}
