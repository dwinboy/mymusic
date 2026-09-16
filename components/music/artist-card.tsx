import Link from "next/link";
import Image from "next/image";
import { Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ArtistCard({
  artist,
  className,
}: {
  artist: { slug: string; name: string; avatarUrl: string | null };
  className?: string;
}) {
  return (
    <Link href={`/artist/${artist.slug}`} className={cn("group w-36 shrink-0 text-center sm:w-40", className)}>
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
        {artist.avatarUrl ? (
          <Image src={artist.avatarUrl} alt={artist.name} fill sizes="160px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-subtle">
            <Mic2 className="h-1/3 w-1/3" />
          </div>
        )}
      </div>
      <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{artist.name}</p>
      <p className="text-xs text-foreground-muted">Artist</p>
    </Link>
  );
}
