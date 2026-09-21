import { TermCard } from "@/components/discovery/term-card";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { getTerms, getTermArtwork, countTracksPerTerm, termHref } from "@/lib/taxonomy";

/**
 * "What are you listening for?" — the featured activities as large entry
 * points. Not playlists: each opens the activity's discovery page, which
 * resolves its tracks from metadata.
 *
 * Driven by which activities an admin has featured, not a hardcoded list.
 */
export async function QuickIntents({ title = "What are you listening for?", limit = 6 }: { title?: string; limit?: number }) {
  const featured = await getTerms("ACTIVITY", { featuredOnly: true });
  if (featured.length === 0) return null;

  // Populated activities lead, but the row still appears before anything is
  // classified — it was the best-looking section in the app and nobody had
  // ever seen it, because every activity started empty.
  const counts = await countTracksPerTerm("ACTIVITY");
  const withMusic = featured.filter((t) => (counts.get(t.id) ?? 0) > 0);
  const withoutMusic = featured.filter((t) => (counts.get(t.id) ?? 0) === 0);
  const intents = [...withMusic, ...withoutMusic].slice(0, limit);
  if (intents.length === 0) return null;

  const artwork = await getTermArtwork(intents, "large");

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      {/* A scrolling row rather than a grid. As a grid it laid every activity
          out at once, which on a phone filled the screen before anyone had
          reached the music — the row shows a few, hints at more by cutting
          the next card at the edge, and takes a fraction of the height. */}
      <HorizontalScroller>
        {intents.map((term) => (
          <TermCard
            key={term.id}
            href={termHref("ACTIVITY", term.slug)!}
            name={term.name}
            imageUrl={artwork.get(term.id)}
            size="lg"
          />
        ))}
      </HorizontalScroller>
    </section>
  );
}
