import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { TermCard } from "@/components/discovery/term-card";
import {
  getTerms,
  getTermArtwork,
  countTracksPerTerm,
  termHref,
  kindIndexHref,
  type BrowsableKind,
} from "@/lib/taxonomy";

function trackCountLabel(n: number) {
  return `${n} ${n === 1 ? "track" : "tracks"}`;
}

/**
 * A horizontally scrolling row of genre / mood / activity / occasion cards.
 * Terms with nothing published are left out rather than shown as dead ends;
 * they appear on their own once creators classify tracks into them.
 */
export async function TermRail({
  kind,
  title,
  subtitle,
  featuredOnly = false,
  size = "md",
}: {
  kind: BrowsableKind;
  title: string;
  subtitle?: string;
  featuredOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const terms = await getTerms(kind, { featuredOnly });
  if (terms.length === 0) return null;

  const counts = await countTracksPerTerm(kind);
  const populated = terms.filter((t) => (counts.get(t.id) ?? 0) > 0);
  if (populated.length === 0) return null;

  const artwork = await getTermArtwork(populated);

  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} href={kindIndexHref(kind)} />
      <HorizontalScroller>
        {populated.map((term) => (
          <TermCard
            key={term.id}
            href={termHref(kind, term.slug)!}
            name={term.name}
            imageUrl={artwork.get(term.id)}
            meta={trackCountLabel(counts.get(term.id) ?? 0)}
            size={size}
          />
        ))}
      </HorizontalScroller>
    </section>
  );
}
