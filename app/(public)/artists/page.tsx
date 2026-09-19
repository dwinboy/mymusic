import type { Metadata } from "next";
import { Mic2 } from "lucide-react";
import { creatorCatalog } from "@/lib/catalog";
import { toCreatorCard } from "@/lib/catalog-cards";
import { creatorListPage } from "@/lib/catalog-lists";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { CreatorCard } from "@/components/music/collection-cards";
import { PaginatedCardGrid } from "@/components/catalog/paginated-card-grid";
import { EmptyState } from "@/components/states/empty-state";

export const metadata: Metadata = {
  title: "Artists",
  description: "The independent creators making AI music on Vibe Banger: featured, rising, popular and new.",
  alternates: { canonical: "/artists" },
};

// Rendered per request so newly approved creators appear without a redeploy.
export const dynamic = "force-dynamic";

export default async function ArtistsPage() {
  const [featured, rising, popular, newest, all] = await Promise.all([
    creatorCatalog.featured(12),
    creatorCatalog.rising(12),
    creatorCatalog.popular(12),
    creatorCatalog.newest(12),
    creatorListPage(null),
  ]);

  const rails = [
    { title: "Featured Creators", subtitle: "Picked by Vibe Banger", creators: featured, label: "Featured" },
    { title: "Rising Creators", subtitle: "Gaining listeners this week", creators: rising, label: "Rising" },
    { title: "Popular Creators", subtitle: "Most listened to", creators: popular, label: "Popular" },
    { title: "New Creators", subtitle: "Newest to Vibe Banger", creators: newest, label: "New" },
  ].filter((rail) => rail.creators.length > 0);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Music</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Artists</h1>
      <p className="mt-1 max-w-xl text-sm text-foreground-muted">Independent creators publishing AI music on Vibe Banger.</p>

      {all.items.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="No creators yet"
          description="Creator profiles appear here once someone publishes their first track."
          actionLabel="Browse songs"
          actionHref="/songs"
          className="mt-10"
        />
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-10">
            {rails.map((rail) => (
              <section key={rail.title}>
                <SectionHeader title={rail.title} subtitle={rail.subtitle} />
                <HorizontalScroller>
                  {rail.creators.map((creator) => (
                    <CreatorCard key={creator.id} creator={toCreatorCard(creator, rail.label === "New" ? "New creator" : "Creator")} />
                  ))}
                </HorizontalScroller>
              </section>
            ))}
          </div>

          <section className="mt-12">
            <SectionHeader title="All Creators" subtitle={all.total !== null ? `${all.total} ${all.total === 1 ? "creator" : "creators"}, A–Z` : undefined} />
            <PaginatedCardGrid type="creators" initialItems={all.items} initialCursor={all.nextCursor} />
          </section>
        </>
      )}
    </div>
  );
}
