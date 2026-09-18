/**
 * Lyrics, timed or not.
 *
 * Timings ride in the same text column as plain lyrics, in LRC — the format
 * every lyric-timing tool already exports:
 *
 *   [00:12.30]First line
 *   [00:15.80]Second line
 *
 * Storing them as text means no schema, no separate editor, and no import
 * pipeline: whoever writes the lyrics pastes LRC instead of prose and the
 * player starts following along. A track whose lyrics carry no timestamps
 * reads exactly as it did before.
 */

export interface LyricLine {
  /** Seconds from the start of the track. */
  time: number;
  text: string;
}

export interface ParsedLyrics {
  /** True when the lyrics carry usable timings and can follow the song. */
  synced: boolean;
  lines: LyricLine[];
  /** The words alone, for the static view and for anything that can't sync. */
  plain: string;
}

// [mm:ss], [mm:ss.xx] or [mm:ss:xx]. Hours are not part of LRC; a song long
// enough to need them can carry minutes past 59.
const TIMESTAMP = /\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g;

const EMPTY: ParsedLyrics = { synced: false, lines: [], plain: "" };

export function parseLyrics(raw: string | null | undefined): ParsedLyrics {
  const text = raw?.trim();
  if (!text) return EMPTY;

  const lines: LyricLine[] = [];
  const plainLines: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    // Each timestamp on a line marks another moment the same words are sung,
    // which is how LRC writes a repeated chorus.
    const stamps = [...rawLine.matchAll(TIMESTAMP)];
    const words = rawLine.replace(TIMESTAMP, "").trim();

    if (stamps.length === 0) {
      // Metadata tags ([ar:…], [ti:…]) are not lyrics and not shown.
      if (!/^\[[a-z]+:.*\]$/i.test(rawLine.trim())) plainLines.push(rawLine);
      continue;
    }

    plainLines.push(words);
    for (const [, minutes, seconds, fraction] of stamps) {
      // A two-digit fraction is centiseconds, three is milliseconds.
      const decimals = fraction ? Number(`0.${fraction}`) : 0;
      lines.push({ time: Number(minutes) * 60 + Number(seconds) + decimals, text: words });
    }
  }

  lines.sort((a, b) => a.time - b.time);

  return {
    // One timestamp is someone's stray bracket, not a timed lyric.
    synced: lines.length > 1,
    lines,
    plain: plainLines.join("\n").trim(),
  };
}

/**
 * The line being sung at this moment, or -1 before the first one. Callers
 * pass sorted lines, which parseLyrics guarantees.
 */
export function activeLineIndex(lines: LyricLine[], currentTime: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time > currentTime) break;
    active = i;
  }
  return active;
}
