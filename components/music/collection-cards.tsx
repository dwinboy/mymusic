import Link from "next/link";
import Image from "next/image";
import { Disc3, ListMusic, Mic2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Album, playlist and creator cards for the catalogue pages, search,
 * Discover and creator profiles. Presentational only (image URLs arrive
 * resolved; see lib/catalog-cards), so the same cards render on the server
 * and when a grid loads more in the browser. Rails use the default width;
 * grids pass className="w-full".
 */

export interface AlbumCardData {
  id: string;
  slug: string;
  title: string;
  cover: string | null;
  subtitle: string;
}

export function AlbumCard({ album, className }: { album: AlbumCardData; className?: string }) {
  return (
    <Link href={`/album/${album.slug}`} className={cn("group w-40 shrink-0 sm:w-44", className)}>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
        {album.cover ? (
          <Image src={album.cover} alt={album.title} fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover" />
        ) : (
          <Disc3 className="h-8 w-8 text-foreground-subtle" />
        )}
      </div>
      <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{album.title}</p>
      {album.subtitle && <p className="truncate text-xs text-foreground-muted">{album.subtitle}</p>}
    </Link>
  );
}

export interface PlaylistCardData {
  id: string;
  slug: string;
  title: string;
  cover: string | null;
  kind: "USER" | "EDITORIAL" | "ALGORITHMIC";
  subtitle: string;
}

export function PlaylistCard({ playlist, className }: { playlist: PlaylistCardData; className?: string }) {
  return (
    <Link href={`/playlist/${playlist.slug}`} className={cn("group w-40 shrink-0 sm:w-44", className)}>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
        {playlist.cover ? (
          <Image src={playlist.cover} alt={playlist.title} fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover" />
        ) : (
          <ListMusic className="h-8 w-8 text-foreground-subtle" />
        )}
        {playlist.kind !== "USER" && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-canvas/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-accent" />
            {playlist.kind === "EDITORIAL" ? "Editorial" : "Collection"}
          </span>
        )}
      </div>
      <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{playlist.title}</p>
      <p className="truncate text-xs text-foreground-muted">{playlist.subtitle}</p>
    </Link>
  );
}

export interface CreatorCardData {
  id: string;
  slug: string;
  name: string;
  avatar: string | null;
  subtitle: string;
}

export function CreatorCard({ creator, className }: { creator: CreatorCardData; className?: string }) {
  return (
    <Link href={`/artist/${creator.slug}`} className={cn("group w-36 shrink-0 text-center sm:w-40", className)}>
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
        {creator.avatar ? (
          <Image src={creator.avatar} alt={creator.name} fill sizes="(min-width: 640px) 200px, 40vw" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-subtle">
            <Mic2 className="h-1/3 w-1/3" />
          </div>
        )}
      </div>
      <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{creator.name}</p>
      <p className="truncate text-xs text-foreground-muted">{creator.subtitle}</p>
    </Link>
  );
}
