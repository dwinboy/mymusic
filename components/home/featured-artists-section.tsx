import { db } from "@/lib/db";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { ArtistCard } from "@/components/music/artist-card";

export async function FeaturedArtistsSection() {
  const artists = await db.artist.findMany({
    where: { isFeatured: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  if (artists.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Featured Artists" href="/artists" />
      <HorizontalScroller>
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </HorizontalScroller>
    </section>
  );
}
