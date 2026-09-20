import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export interface ProcessedAudio {
  streamingBuffer: Buffer;
  streamingFormat: "m4a";
  /** What to serve it as. The format is no longer always MP3. */
  streamingContentType: string;
  downloadBuffer?: Buffer;
  downloadFormat?: "mp3";
  downloadContentType?: string;
  /**
   * The master's integrated loudness in LUFS before levelling, or null if it
   * couldn't be measured — in which case the copies are not levelled.
   */
  loudnessLufs: number | null;
}

export interface AudioProcessingService {
  /**
   * Transforms a master audio file into a web-optimized streaming copy and,
   * optionally, a separate download-quality copy. Storage-agnostic on
   * purpose (see lib/media/audio-service.ts) — swap this implementation for
   * a queue-backed worker later without touching any caller.
   */
  process(input: {
    originalBuffer: Buffer;
    sourceExtension: string;
    createDownloadVersion: boolean;
  }): Promise<ProcessedAudio>;
}

/**
 * Streaming is AAC in an MP4 container; downloads stay MP3.
 *
 * AAC-LC at 160k is about the same to listen to as MP3 at 192k and roughly a
 * sixth smaller — which on a phone paying for data is the difference people
 * actually feel, along with a track that starts sooner. Every browser that
 * can play audio at all can play AAC.
 *
 * The download copy stays MP3 because it leaves the app: it gets put on
 * cheap players, in cars, and into other people's software, and MP3 is the
 * format all of those agree on.
 */
const STREAMING_BITRATE = "160k";
const DOWNLOAD_BITRATE = "320k";

/**
 * Loudness normalization, to EBU R128 / the level streaming services target.
 *
 * Tracks arrive mastered at whatever level their creator chose, so a loud one
 * next to a quiet one means reaching for the volume between songs. The
 * encoded copies are levelled instead of the player adjusting volume at
 * playback: iOS ignores an audio element's volume entirely, and an element
 * can't amplify a quiet track above 1 anyway. The uploaded master is kept
 * untouched in storage, so re-transcoding to a different target stays possible.
 */
const TARGET_LUFS = -14;
const TARGET_TRUE_PEAK = -1;
const TARGET_RANGE = 11;

interface LoudnessMeasurement {
  integratedLufs: number;
  /** loudnorm's second-pass arguments, measured from this exact input. */
  filter: string;
}

/**
 * First loudnorm pass: measures the input. The numbers feed the second pass,
 * which is what makes the correction linear — a single pass adjusts
 * dynamically as it goes and audibly pumps.
 */
async function measureLoudness(ffmpeg: string, inputPath: string): Promise<LoudnessMeasurement | null> {
  try {
    // loudnorm prints its measurements to stderr; -f null discards the audio.
    const { stderr } = await execFileAsync(ffmpeg, [
      "-i",
      inputPath,
      "-vn",
      "-af",
      `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_RANGE}:print_format=json`,
      "-f",
      "null",
      "-",
    ]);
    // The JSON block is the last thing printed, after the usual FFmpeg banner.
    const start = stderr.lastIndexOf("{");
    const end = stderr.lastIndexOf("}");
    if (start === -1 || end <= start) return null;

    const m = JSON.parse(stderr.slice(start, end + 1)) as Record<string, string>;
    const integratedLufs = Number(m.input_i);
    // Digital silence reports -inf, and every measurement has to be usable
    // before the second pass can be trusted with them.
    const measured = [m.input_i, m.input_tp, m.input_lra, m.input_thresh, m.target_offset].map(Number);
    if (!measured.every(Number.isFinite)) return null;

    return {
      integratedLufs,
      filter:
        `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_RANGE}` +
        `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
        `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    };
  } catch {
    // Never fail an upload over loudness: an unmeasured track is encoded
    // unlevelled, exactly as every track was before this existed.
    return null;
  }
}

/**
 * Runs FFmpeg synchronously within the request. Fine for the AI-generated,
 * minutes-long tracks this platform ships (transcodes in low single-digit
 * seconds) — a genuinely large catalog with much longer masters would want
 * to swap this for a queue + worker, which is exactly what this interface
 * exists to make possible without an application-wide rewrite.
 */
export class FfmpegAudioProcessingService implements AudioProcessingService {
  async process({
    originalBuffer,
    sourceExtension,
    createDownloadVersion,
  }: {
    originalBuffer: Buffer;
    sourceExtension: string;
    createDownloadVersion: boolean;
  }): Promise<ProcessedAudio> {
    if (!ffmpegPath) {
      throw new Error("ffmpeg-static did not resolve a binary for this platform.");
    }

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "vibebanger-audio-"));
    try {
      const inputPath = path.join(tmpDir, `input.${sourceExtension}`);
      await writeFile(inputPath, originalBuffer);

      // Measure once, from the master, and level both encodes with it.
      const loudness = await measureLoudness(ffmpegPath, inputPath);
      const levelling = loudness ? ["-af", loudness.filter] : [];

      const encode = async (outputPath: string, bitrate: string, codec: string[]) => {
        await execFileAsync(ffmpegPath!, [
          "-y",
          "-i",
          inputPath,
          "-vn",
          ...levelling,
          ...codec,
          "-b:a",
          bitrate,
          "-ar",
          "44100",
          outputPath,
        ]);
        return readFile(outputPath);
      };

      // faststart moves the index to the front of the file. Without it a
      // browser has to fetch the whole thing before it can play a second of
      // it, which would undo the point of the smaller file.
      const streamingBuffer = await encode(path.join(tmpDir, "streaming.m4a"), STREAMING_BITRATE, [
        "-codec:a",
        "aac",
        "-movflags",
        "+faststart",
      ]);
      const downloadBuffer = createDownloadVersion
        ? await encode(path.join(tmpDir, "download.mp3"), DOWNLOAD_BITRATE, ["-codec:a", "libmp3lame"])
        : undefined;

      return {
        streamingBuffer,
        streamingFormat: "m4a",
        streamingContentType: "audio/mp4",
        downloadBuffer,
        downloadFormat: downloadBuffer ? "mp3" : undefined,
        downloadContentType: downloadBuffer ? "audio/mpeg" : undefined,
        loudnessLufs: loudness?.integratedLufs ?? null,
      };
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }
}

let defaultService: AudioProcessingService | null = null;

export function getAudioProcessingService(): AudioProcessingService {
  if (!defaultService) defaultService = new FfmpegAudioProcessingService();
  return defaultService;
}
