import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { db } from "@/lib/db";
import { getObjectBuffer } from "@/lib/media/r2-client";

/** Bars in a waveform: enough detail for a phone-width seek bar, small to store and send. */
export const WAVEFORM_BARS = 100;

/** A low sample rate is plenty for loudness and keeps decoding fast. */
const DECODE_RATE = 2000;

/**
 * Loudness per slice of the track, 0–1. RMS rather than peak, so a single
 * click doesn't flatten the rest. Mastered music barely varies in loudness
 * from section to section, so values are stretched between a quiet baseline
 * (just under the 10th percentile) and the loudest slice: that's what makes
 * intros, breaks and drops visible instead of a solid block. Silence stays
 * at zero.
 */
export async function computeWaveform(audio: Buffer, extension = "mp3"): Promise<number[]> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not resolve a binary for this platform.");

  const dir = await mkdtemp(path.join(os.tmpdir(), "vibebanger-waveform-"));
  try {
    const input = path.join(dir, `input.${extension}`);
    await writeFile(input, audio);
    const pcm = await new Promise<Buffer>((resolve, reject) => {
      execFile(
        ffmpegPath!,
        ["-v", "error", "-i", input, "-vn", "-ac", "1", "-ar", String(DECODE_RATE), "-f", "s16le", "-acodec", "pcm_s16le", "-"],
        { encoding: "buffer", maxBuffer: 256 * 1024 * 1024 },
        (error, stdout) => (error ? reject(error) : resolve(stdout))
      );
    });

    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
    if (samples.length === 0) return [];

    const perBar = Math.max(1, Math.floor(samples.length / WAVEFORM_BARS));
    const rms: number[] = [];
    for (let bar = 0; bar < WAVEFORM_BARS; bar++) {
      const start = bar * perBar;
      const end = bar === WAVEFORM_BARS - 1 ? samples.length : Math.min(samples.length, start + perBar);
      if (start >= end) {
        rms.push(0);
        continue;
      }
      let sum = 0;
      for (let i = start; i < end; i++) sum += samples[i] * samples[i];
      rms.push(Math.sqrt(sum / (end - start)));
    }

    const loudest = Math.max(...rms);
    if (loudest === 0) return rms.map(() => 0);
    const baseline = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * 0.1)] * 0.85;
    const range = loudest - baseline || loudest;
    return rms.map((value) => {
      if (value < loudest * 0.02) return 0;
      const stretched = Math.min(1, Math.max(0, (value - baseline) / range));
      return Math.round((0.12 + 0.88 * Math.pow(stretched, 0.8)) * 1000) / 1000;
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The streaming audio as stored: R2 by key, or a local upload in development. */
async function readStreamingAudio(track: { streamingStorageKey: string | null; audioUrl: string | null }): Promise<Buffer | null> {
  if (track.streamingStorageKey) return getObjectBuffer(track.streamingStorageKey);
  if (!track.audioUrl) return null;
  if (track.audioUrl.startsWith("/")) {
    // Local storage serves from public/, and only from there.
    const file = path.normalize(path.join(process.cwd(), "public", track.audioUrl));
    if (!file.startsWith(path.join(process.cwd(), "public"))) return null;
    return readFile(file);
  }
  const res = await fetch(track.audioUrl, { signal: AbortSignal.timeout(20000) });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

/**
 * A published track's waveform, computing and saving it the first time it's
 * asked for. Tracks processed before waveforms existed get theirs this way,
 * with no separate backfill job.
 */
export async function getOrComputeWaveform(trackId: string): Promise<number[] | null> {
  const track = await db.track.findFirst({
    where: { id: trackId, isPublished: true, processingStatus: "READY" },
    select: { id: true, waveform: true, streamingStorageKey: true, audioUrl: true },
  });
  if (!track) return null;
  if (track.waveform.length > 0) return track.waveform;

  const audio = await readStreamingAudio(track);
  if (!audio) return [];
  const waveform = await computeWaveform(audio, "mp3");
  if (waveform.length > 0) {
    await db.track.update({ where: { id: track.id }, data: { waveform } });
  }
  return waveform;
}
