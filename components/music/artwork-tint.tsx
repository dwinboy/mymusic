"use client";

import { useDominantColor } from "@/hooks/use-dominant-color";

/**
 * A wash of the artwork's own colour behind a page's hero.
 *
 * The full-screen player has tinted itself per track since it was built;
 * everywhere else was the same near-black whatever was on it, so a page
 * about one record looked like a page about any record. This puts the
 * record's colour behind the record.
 *
 * Deliberately behind and above: it sits under the content at the very top
 * of the page and fades out well before the fold, so it colours the hero
 * without tinting the reading below it.
 *
 * The colour is pulled client-side from the artwork, which means it arrives
 * a beat after the page does — so it fades in rather than snapping, and a
 * cover with nothing usable in it (greyscale, near-black) simply never
 * resolves and leaves the page exactly as it was.
 */
export function ArtworkTint({ src }: { src: string | null | undefined }) {
  const color = useDominantColor(src);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] transition-opacity duration-700 motion-reduce:transition-none"
      style={{
        opacity: color ? 1 : 0,
        backgroundImage: color
          ? `radial-gradient(120% 100% at 50% 0%, color-mix(in srgb, ${color} 26%, transparent), transparent 70%)`
          : undefined,
      }}
    />
  );
}
