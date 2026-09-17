/**
 * Shared-link helpers. A song link can carry a start time (?t=84), so a
 * listener can share the moment they're hearing rather than the whole track.
 */

/** Shorter than this into a track, "share from here" is just "share". */
export const MIN_SHARE_MOMENT_SECONDS = 5;

/**
 * Reads a start time from a link. Accepts the forms people paste or type:
 * "84", "84s", "1:24", "1m24s". Anything unparseable, at the very start, or
 * past the end of the track is ignored rather than half-applied.
 */
export function parseStartParam(value: string | string[] | undefined, duration: number): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const text = raw.trim().toLowerCase();

  let seconds: number | null = null;
  if (/^\d+s?$/.test(text)) {
    seconds = parseInt(text, 10);
  } else if (/^\d+:\d{1,2}$/.test(text)) {
    const [m, s] = text.split(":").map(Number);
    seconds = s < 60 ? m * 60 + s : null;
  } else {
    const match = /^(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
    if (match && (match[1] || match[2])) seconds = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  }

  if (seconds === null || seconds < 1) return null;
  if (duration > 0 && seconds >= duration) return null;
  return seconds;
}

export function withStartTime(url: string, seconds: number): string {
  const target = new URL(url, "https://placeholder.invalid");
  target.searchParams.set("t", String(Math.floor(seconds)));
  return url.startsWith("http") ? target.toString() : `${target.pathname}${target.search}`;
}
