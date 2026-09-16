import { parseBuffer } from "music-metadata";

export interface ExtractedAudioMetadata {
  durationSeconds: number;
  format: string | undefined;
  mimeType: string;
  fileSize: number;
}

const SUPPORTED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
]);

export function isSupportedAudioType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}

export async function extractAudioMetadata(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedAudioMetadata> {
  const metadata = await parseBuffer(buffer, { mimeType });

  return {
    durationSeconds: Math.round(metadata.format.duration ?? 0),
    format: metadata.format.codec ?? metadata.format.container,
    mimeType,
    fileSize: buffer.byteLength,
  };
}
