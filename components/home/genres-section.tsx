import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { TermCard } from "@/components/discovery/term-card";
import { getTerms, getTermArtwork, termHref, countTracksPerTerm } from "@/lib/taxonomy";

export async function GenresSection() {
  const genres = await getTerms("GENRE");
  if (genres.length === 0) return null;

  const [artwork, counts] = await Promise.all([getTermArtwork(genres), countTracksPerTerm("GENRE")]);

  // Genres with nothing published in them are a dead end on the homepage.
  const populated = genres.filter((g) => (counts.get(g.id) ?? 0) > 0);
  if (populated.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Explore Your Sound" href="/genres" />
      <HorizontalScroller>
        {populated.map((genre) => (
          <TermCard
            key={genre.id}
            href={termHref("GENRE", genre.slug)!}
            name={genre.name}
            imageUrl={artwork.get(genre.id)}
            meta={`${counts.get(genre.id)} ${counts.get(genre.id) === 1 ? "track" : "tracks"}`}
          />
        ))}
      </HorizontalScroller>
    </section>
  );
}
