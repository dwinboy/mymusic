import Link from "next/link";
import Image from "next/image";
import { PlayButton } from "@/components/player/play-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import type { PlayerTrack } from "@/lib/types";
import type { TaxonomyKind } from "@/lib/generated/prisma/client";
import { TermChips, TermLine } from "@/components/discovery/term-links";

/**
 * The featured slot at the top of the homepage.
 *
 * Two compositions, because a phone and a desktop want different things from
 * it. On a wide screen it is editorial: cover to the left, the release written
 * out beside it, facts set against the right edge.
 *
 * On a phone that arrangement fell apart — a 176px cover stranded in a 358px
 * card with a dead column beside it, genre chips wrapping to two rows, and a
 * play button alone at the bottom of a 567px block, two-thirds of the screen
 * spent on one song. So on a phone the artwork *is* the card: full-bleed,
 * square, with the title, artist and play control sitting on it in one tight
 * band. Nothing is stranded because there is no leftover space to strand it
 * in, and it reads as a piece of music rather than a text layout.
 *
 * The description and the chip rail are dropped there deliberately. They are
 * the first things to go when space is scarce, and the artwork plus the artist
 * already say what the card is.
 */
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
  const songHref = `/song/${track.slug}`;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border shadow-elevated">
      {/* An ambient wash of the artwork, behind the composition. A phone shows
          the artwork itself at full width, where this would only muddy it. */}
      <div className="absolute inset-0 hidden md:block">
        {track.coverUrl && (
          <Image
            src={track.coverUrl}
            alt=""
            fill
            sizes="100vw"
            className="scale-110 object-cover opacity-40 blur-2xl"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/80 to-canvas/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas/60 via-transparent to-transparent" />
      </div>

      <div className="relative md:flex md:items-end md:gap-8 md:p-10">
        <Link
          href={songHref}
          aria-label={`${track.title} by ${track.artistName}`}
          className="group relative block aspect-square w-full shrink-0 overflow-hidden sm:aspect-[16/9] md:aspect-square md:w-64 md:rounded-xl md:shadow-elevated xl:w-72"
        >
          {track.coverUrl && (
            <Image
              src={track.coverUrl}
              alt={track.title}
              fill
              priority
              sizes="(min-width: 768px) 288px, 100vw"
              className="object-cover transition-transform duration-500 motion-reduce:transition-none md:group-hover:scale-105 md:motion-reduce:group-hover:scale-100"
            />
          )}
          {/* Carries the overlaid text on a phone. The stops keep it inside the
              bottom band: above 65% the artwork is untouched, which is the
              difference between a cover with text on it and a dimmed card. */}
          <div className="absolute inset-0 bg-gradient-to-t from-canvas from-[15%] via-canvas/65 via-[42%] to-transparent to-[68%] md:hidden" />
        </Link>

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4 sm:p-6 md:static md:block md:min-w-0 md:flex-1 md:p-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent sm:text-xs">{eyebrow}</p>

            <h1 className="mt-1.5 text-[27px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl md:mt-2 md:text-5xl">
              <Link href={songHref} className="transition-colors hover:text-accent">
                {track.title}
              </Link>
            </h1>

            {/* Artist, length and the explicit mark on one line — the facts a
                listener actually wants before pressing play. On a wide screen
                the length moves to the meta column, so it isn't repeated. */}
            <p className="mt-1.5 flex min-w-0 items-center gap-2 text-sm text-foreground-muted md:mt-2 md:text-base">
              <Link href={`/artist/${track.artistSlug}`} className="truncate transition-colors hover:text-foreground hover:underline">
                {track.artistName}
              </Link>
              <span aria-hidden className="text-foreground-subtle md:hidden">
                ·
              </span>
              <span className="shrink-0 tabular-nums md:hidden">{formatDuration(track.duration)}</span>
              {track.isExplicit && (
                <Badge variant="outline" className="shrink-0 px-1 py-0 text-[9px]">
                  E
                </Badge>
              )}
            </p>

            <TermLine terms={terms.slice(0, 3)} className="mt-1.5 text-xs md:hidden" />

            <p className="mt-3 hidden max-w-lg text-base text-foreground-muted md:block">{description}</p>
            <TermChips terms={terms} className="mt-5 hidden md:flex" />

            <div className="mt-6 hidden items-center gap-3 md:flex">
              <PlayButton track={track} size="lg" startAt={startAt} />
              {albumHref && (
                <Button variant="secondary" size="lg" asChild>
                  <Link href={albumHref}>View album</Link>
                </Button>
              )}
            </div>
          </div>

          {/* On a phone the play control anchors the band's right edge, level
              with the title, where a thumb already is. */}
          <PlayButton track={track} size="lg" startAt={startAt} className="mb-0.5 md:hidden" />
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
