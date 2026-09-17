import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export interface ProcessedAudio {
  streamingBuffer: Buffer;
  streamingFormat: "mp3";
  downloadBuffer?: Buffer;
  downloadFormat?: "mp3";
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

const STREAMING_BITRATE = "192k";
const DOWNLOAD_BITRATE = "320k";

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

      const streamingPath = path.join(tmpDir, "streaming.mp3");
      await execFileAsync(ffmpegPath, [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        STREAMING_BITRATE,
        "-ar",
        "44100",
        streamingPath,
      ]);
      const streamingBuffer = await readFile(streamingPath);

      let downloadBuffer: Buffer | undefined;
      if (createDownloadVersion) {
        const downloadPath = path.join(tmpDir, "download.mp3");
        await execFileAsync(ffmpegPath, [
          "-y",
          "-i",
          inputPath,
          "-vn",
          "-codec:a",
          "libmp3lame",
          "-b:a",
          DOWNLOAD_BITRATE,
          "-ar",
          "44100",
          downloadPath,
        ]);
        downloadBuffer = await readFile(downloadPath);
      }

      return {
        streamingBuffer,
        streamingFormat: "mp3",
        downloadBuffer,
        downloadFormat: downloadBuffer ? "mp3" : undefined,
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
