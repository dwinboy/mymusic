import Link from "next/link";
import Image from "next/image";
import { PlayButton } from "@/components/player/play-button";
import { Button } from "@/components/ui/button";
import type { PlayerTrack } from "@/lib/types";

export function Hero({
  track,
  description,
  albumHref,
}: {
  track: PlayerTrack;
  description: string;
  albumHref?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      <div className="absolute inset-0">
        {track.coverUrl && (
          <Image
            src={track.coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover opacity-40 blur-2xl"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/80 to-canvas/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas/60 via-transparent to-transparent" />
      </div>

      <div className="relative flex flex-col gap-6 p-6 sm:p-10 md:flex-row md:items-end">
        <div className="relative aspect-square w-44 shrink-0 overflow-hidden rounded-xl shadow-elevated sm:w-56 md:w-64">
          {track.coverUrl && (
            <Image src={track.coverUrl} alt={track.title} fill sizes="256px" className="object-cover" priority />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Featured Release</p>
          <h1 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {track.title}
          </h1>
          <Link href={`/artist/${track.artistSlug}`} className="mt-2 inline-block text-base text-foreground-muted hover:text-foreground hover:underline">
            {track.artistName}
          </Link>
          <p className="mt-3 max-w-lg text-sm text-foreground-muted sm:text-base">{description}</p>

          <div className="mt-6 flex items-center gap-3">
            <PlayButton track={track} size="lg" />
            {albumHref && (
              <Button variant="secondary" size="lg" asChild>
                <Link href={albumHref}>View album</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
