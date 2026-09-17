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

  // Populated terms first, so the page leads with somewhere to go; empty ones
  // stay listed after them so the full shape of the taxonomy is visible.
  const populated = terms.filter((t) => (counts.get(t.id) ?? 0) > 0);
  const empty = terms.filter((t) => (counts.get(t.id) ?? 0) === 0);
  const artwork = await getTermArtwork(populated, "large");

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 sm:py-12">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{copy.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">{copy.title}</h1>
      <p className="mt-3 max-w-xl text-base text-foreground-muted">{copy.description}</p>

      {terms.length === 0 ? (
        <EmptyState icon={Compass} title="Nothing here yet" className="mt-10" actionLabel="Back to Discover" actionHref="/discover" />
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {populated.map((term) => {
              const n = counts.get(term.id) ?? 0;
              return (
                <TermCard
                  key={term.id}
                  href={termHref(kind, term.slug)!}
                  name={term.name}
                  imageUrl={artwork.get(term.id)}
                  meta={`${n} ${n === 1 ? "track" : "tracks"}`}
                  size="fill"
                />
              );
            })}
          </div>

          {empty.length > 0 && (
            <div className="mt-12">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Coming soon</h2>
              <p className="mt-1 text-sm text-foreground-muted">No music has been classified here yet.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {empty.map((term) => (
                  <span key={term.id} className="rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground-subtle">
                    {term.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
