import { db } from "@/lib/db";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { GenreTile } from "@/components/music/genre-tile";

export async function GenresSection() {
  const genres = await db.genre.findMany({ orderBy: { name: "asc" } });

  if (genres.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Browse by Genre" />
      <HorizontalScroller>
        {genres.map((genre, i) => (
          <GenreTile key={genre.id} genre={genre} index={i} />
        ))}
      </HorizontalScroller>
    </section>
  );
}
