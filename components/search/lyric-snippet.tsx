import { Quote } from "lucide-react";
import { findLyricMatch } from "@/lib/lyric-match";
import type { PlayerTrack } from "@/lib/types";

/**
 * The line that put a song in the results.
 *
 * Without it, a track matched on its lyrics looks like a bug: the words
 * aren't in the title or the artist, so the row gives no reason for being
 * there. With it, the row shows the thing the person was probably searching
 * for in the first place.
 *
 * Renders nothing when the query is already visible in the title or artist,
 * so a normal search doesn't grow a quotation under every result.
 */
export function LyricSnippet({ query, track }: { query: string; track: PlayerTrack }) {
  const match = findLyricMatch(query, track);
  if (!match) return null;

  const before = match.line.slice(0, match.start);
  const hit = match.line.slice(match.start, match.start + match.length);
  const after = match.line.slice(match.start + match.length);

  return (
    <p className="-mt-1 mb-1 flex items-start gap-1.5 pl-[4.25rem] text-xs text-foreground-subtle md:pl-[6.5rem]">
      <Quote className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="line-clamp-1">
        {before}
        <mark className="bg-transparent font-medium text-foreground">{hit}</mark>
        {after}
      </span>
    </p>
  );
}
