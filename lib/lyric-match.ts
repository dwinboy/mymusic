import { parseLyrics } from "@/lib/lyrics";

/**
 * The line of a song that a search matched.
 *
 * A result that appears because of its lyrics looks like a mistake unless the
 * page says why: the title doesn't contain the words, the artist doesn't, and
 * nothing on the row explains what it's doing there. Showing the line answers
 * that, and it's usually the thing the person was actually looking for.
 *
 * Returns null when the query is already visible in the title, artist or
 * album — repeating it as a quotation underneath would be noise.
 */
export interface LyricMatch {
  /** The matching line, trimmed of any LRC timing. */
  line: string;
  /** Where the query starts within `line`, for highlighting. */
  start: number;
  length: number;
}

export function findLyricMatch(
  query: string,
  track: { title: string; artistName?: string | null; albumTitle?: string | null; lyrics?: string | null }
): LyricMatch | null {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2 || !track.lyrics) return null;

  const alreadyShown = [track.title, track.artistName, track.albumTitle]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(needle));
  if (alreadyShown) return null;

  // parseLyrics strips LRC timestamps, so a search never quotes "[00:12.30]"
  // back at someone.
  const lines = parseLyrics(track.lyrics).plain.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    const start = line.toLowerCase().indexOf(needle);
    if (start !== -1) return { line, start, length: needle.length };
  }
  return null;
}
