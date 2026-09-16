/**
 * Audio replacement writes under a fresh `version` suffix instead of
 * overwriting a published track's live key — the DB pointer only swaps to
 * the new key once processing succeeds, so a failed replace never takes a
 * live track offline. Omit `version` for a track's first (and usually only)
 * upload to get the plain, spec'd key shape.
 */
export function originalAudioKey(trackId: string, extension: string, version?: string): string {
  const name = version ? `original-${version}` : "original";
  return `music/originals/${trackId}/${name}.${extension}`;
}

export function streamingAudioKey(trackId: string, extension = "mp3", version?: string): string {
  const name = version ? `audio-${version}` : "audio";
  return `music/streaming/${trackId}/${name}.${extension}`;
}

export function downloadAudioKey(trackId: string, extension: string, version?: string): string {
  const name = version ? `download-${version}` : "download";
  return `music/downloads/${trackId}/${name}.${extension}`;
}
