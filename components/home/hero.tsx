import Link from "next/link";
import Image from "next/image";
import { PlayButton } from "@/components/player/play-button";
import { Button } from "@/components/ui/button";
import type { PlayerTrack } from "@/lib/types";
import type { TaxonomyKind } from "@/lib/generated/prisma/client";
import { TermChips } from "@/components/discovery/term-links";

export function Hero({
  track,
  description,
  albumHref,
  eyebrow = "Featured Release",
  startAt,
  terms = [],
  meta = [],
}: {
  track: PlayerTrack;
  description: string;
  albumHref?: string;
  /** What the track is, as links into the catalogue. */
  terms?: { id: string; kind: TaxonomyKind; name: string; slug: string }[];
  /** Facts about the release, set against the right edge on wide screens. */
  meta?: { label: string; value: string }[];
  /** What the slot is: an editorial feature, or this listener's own music. */
  eyebrow?: string;
  /** Seconds to resume from, when the hero is picking up a part-heard track. */
  startAt?: number;
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
        <div className="relative aspect-square w-44 shrink-0 overflow-hidden rounded-xl shadow-elevated sm:w-56 md:w-64 xl:w-72">
          {track.coverUrl && (
            <Image src={track.coverUrl} alt={track.title} fill sizes="256px" className="object-cover" priority />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {track.title}
          </h1>
          <Link href={`/artist/${track.artistSlug}`} className="mt-2 inline-block text-base text-foreground-muted hover:text-foreground hover:underline">
            {track.artistName}
          </Link>
          <p className="mt-3 max-w-lg text-sm text-foreground-muted sm:text-base">{description}</p>
          <TermChips terms={terms} className="mt-5" />

          <div className="mt-6 flex items-center gap-3">
            <PlayButton track={track} size="lg" startAt={startAt} />
            {albumHref && (
              <Button variant="secondary" size="lg" asChild>
                <Link href={albumHref}>View album</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Set against the right edge so the hero reads as one composition on
            a wide screen instead of a column of text beside empty space.
            Hidden on narrow screens, where there is no space to balance. */}
        {meta.length > 0 && (
          <dl className="hidden shrink-0 flex-col items-end gap-4 text-right lg:flex">
            {meta.map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground-subtle">{item.label}</dt>
                <dd className="mt-1 text-sm text-foreground-muted">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
