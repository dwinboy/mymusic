import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { getTerms, getTermArtwork, countTracksPerTerm, termHref, kindIndexHref, type BrowsableKind } from "@/lib/taxonomy";
import { TermCard } from "@/components/discovery/term-card";
import { EmptyState } from "@/components/states/empty-state";

const COPY: Record<BrowsableKind, { eyebrow: string; title: string; description: string; seoTitle: string }> = {
  GENRE: {
    eyebrow: "Genres",
    title: "What it sounds like",
    description: "Every style in the catalogue, from ambient textures to Afrobeats.",
    seoTitle: "Music Genres",
  },
  MOOD: {
    eyebrow: "Moods",
    title: "How you want to feel",
    description: "Music chosen for the feeling it leaves you with.",
    seoTitle: "Music by Mood",
  },
  ACTIVITY: {
    eyebrow: "Activities",
    title: "Music for every moment",
    description: "Sleep, focus, work out or wind down — music made for what you're doing.",
    seoTitle: "Music for Activities",
  },
  OCCASION: {
    eyebrow: "Occasions",
    title: "Music for your occasion",
    description: "Weddings, dinners, celebrations and everything in between.",
    seoTitle: "Music for Occasions",
  },
};

export function termIndexMetadata(kind: BrowsableKind): Metadata {
  const copy = COPY[kind];
  return {
    title: copy.seoTitle,
    description: copy.description,
    alternates: { canonical: kindIndexHref(kind) },
  };
}

export async function TermIndexPage({ kind }: { kind: BrowsableKind }) {
  const copy = COPY[kind];
  const terms = await getTerms(kind);
  const counts = await countTracksPerTerm(kind);

  // Populated first, so the page leads with somewhere to go — but every
  // category is a card either way. Listing the empty ones as bare chips made
  // sense for a full catalogue; on a young one it turned the best surface in
  // the app into a wall of grey pills and hid the artwork entirely.
  const populated = terms.filter((t) => (counts.get(t.id) ?? 0) > 0);
  const empty = terms.filter((t) => (counts.get(t.id) ?? 0) === 0);
  const ordered = [...populated, ...empty];
  const artwork = await getTermArtwork(ordered, "large");

  return (
    <div className="relative mx-auto max-w-[1600px] px-4 py-8 sm:px-8 sm:py-12">
      {/* These are landing pages — people arrive on them from search, not by
          walking through the app — and they opened as three lines of type
          above a grid. A warm band gives each one a threshold to cross
          before the cards start.

          Behind the type and bounded in height, so the grid below stays on
          the page's own ground and the artwork keeps its contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64"
        style={{
          background:
            "radial-gradient(ellipse 800px 300px at 15% 0%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 70%)",
        }}
      />
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{copy.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">{copy.title}</h1>
      <p className="mt-3 max-w-xl text-base text-foreground-muted">{copy.description}</p>

      {terms.length === 0 ? (
        <EmptyState icon={Compass} title="Nothing here yet" className="mt-10" actionLabel="Back to Discover" actionHref="/discover" />
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {ordered.map((term) => {
              const n = counts.get(term.id) ?? 0;
              return (
                <TermCard
                  key={term.id}
                  href={termHref(kind, term.slug)!}
                  name={term.name}
                  imageUrl={artwork.get(term.id)}
                  // Honest about being empty without hiding the category: the
                  // page it opens says what to listen to instead.
                  meta={n > 0 ? `${n} ${n === 1 ? "track" : "tracks"}` : "Coming soon"}
                  size="fill"
                  className={n === 0 ? "opacity-70 transition-opacity hover:opacity-100" : undefined}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
