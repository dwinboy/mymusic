import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { PUBLIC_ARTIST_WHERE, PUBLIC_TRACK_WHERE } from "@/lib/public-scope";
import { Mic2 } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";

export const metadata: Metadata = {
  title: "Artists",
  description: "Every artist publishing music on Vibe Banger.",
};

// Rendered per request so newly added artists appear without a redeploy.
export const dynamic = "force-dynamic";

export default async function ArtistsPage() {
  const artists = await db.artist.findMany({
    where: PUBLIC_ARTIST_WHERE,
    orderBy: { name: "asc" },
    // Published tracks only: counting all of them exposed how many unreleased
    // drafts a creator had.
    include: { _count: { select: { tracks: { where: PUBLIC_TRACK_WHERE } } } },
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Artists</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">All Artists</h1>

      {artists.length === 0 ? (
        <EmptyState icon={Mic2} title="No artists yet" className="mt-10" />
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {artists.map((artist) => (
            <Link key={artist.id} href={`/artist/${artist.slug}`} className="group text-center">
              <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
                {artist.avatarUrl ? (
                  <Image src={artist.avatarUrl} alt={artist.name} fill sizes="200px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-foreground-subtle">
                    <Mic2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{artist.name}</p>
              <p className="text-xs text-foreground-muted">{artist._count.tracks} tracks</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
