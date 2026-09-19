import type { Metadata } from "next";
import { ListMusic } from "lucide-react";
import { playlistCatalog } from "@/lib/catalog";
import { toPlaylistCard } from "@/lib/catalog-cards";
import { playlistListPage } from "@/lib/catalog-lists";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { PlaylistCard } from "@/components/music/collection-cards";
import { PaginatedCardGrid } from "@/components/catalog/paginated-card-grid";
import { EmptyState } from "@/components/states/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Playlists",
  description: "Editorial playlists, mood and activity collections, and listeners' playlists on Vibe Banger.",
  alternates: { canonical: "/playlists" },
};

export default async function PlaylistsPage() {
  const [editorial, collections, community] = await Promise.all([
    playlistCatalog.editorial(16),
    playlistCatalog.collections(16),
    playlistListPage(null),
  ]);

  const empty = editorial.length === 0 && collections.length === 0 && community.items.length === 0;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Music</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Playlists</h1>

      {empty ? (
        <EmptyState
          icon={ListMusic}
          title="No playlists yet"
          description="Make one from any song's menu, and share it by making it public."
          actionLabel="Browse songs"
          actionHref="/songs"
          className="mt-10"
        />
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {editorial.length > 0 && (
            <section>
              <SectionHeader title="From Vibe Banger" subtitle="Hand-picked by our editors" />
              <HorizontalScroller>
                {editorial.map((p) => (
                  <PlaylistCard key={p.id} playlist={toPlaylistCard(p)} />
                ))}
              </HorizontalScroller>
            </section>
          )}
          {collections.length > 0 && (
            <section>
              <SectionHeader title="Collections" subtitle="Always up to date with the catalogue" />
              <HorizontalScroller>
                {collections.map((p) => (
                  <PlaylistCard key={p.id} playlist={toPlaylistCard(p)} />
                ))}
              </HorizontalScroller>
            </section>
          )}
          {community.items.length > 0 && (
            <section>
              <SectionHeader title="From Listeners" subtitle="Public playlists made by the community" />
              <PaginatedCardGrid type="playlists" initialItems={community.items} initialCursor={community.nextCursor} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
