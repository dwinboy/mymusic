import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const TMP_DIR = path.join(process.cwd(), ".seed-tmp");
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

export interface ToneSpec {
  /** Chord frequencies (Hz) mixed together to form a simple pad/tone. */
  frequencies: number[];
  durationSec: number;
  /** Rhythmic amplitude pulsing, for more "electronic" feeling genres. */
  tremoloHz?: number;
  /** 0-1 amount of soft noise texture mixed in, for lo-fi/ambient feel. */
  noiseMix?: number;
  lowpassHz?: number;
}

/**
 * Generates a short placeholder audio clip (a mixed sine-wave chord with a
 * gentle envelope) purely so the demo catalogue has real, playable audio
 * with accurate duration/format metadata. Not intended to sound like music —
 * swap in real uploads via /admin/tracks/new and delete this seed data.
 */
export function generateToneWav(outPath: string, spec: ToneSpec) {
  const { frequencies, durationSec, tremoloHz, noiseMix, lowpassHz } = spec;
  mkdirSync(path.dirname(outPath), { recursive: true });

  const inputs: string[] = [];
  const labels: string[] = [];
  frequencies.forEach((freq, i) => {
    inputs.push("-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${durationSec}:sample_rate=44100`);
    labels.push(`[${i}:a]`);
  });

  let noiseIndex = -1;
  if (noiseMix && noiseMix > 0) {
    inputs.push("-f", "lavfi", "-i", `anoisesrc=duration=${durationSec}:color=pink:amplitude=${noiseMix}`);
    noiseIndex = frequencies.length;
    labels.push(`[${noiseIndex}:a]`);
  }

  const weights = frequencies.map((_, i) => (i === 0 ? 1 : 0.6 - i * 0.08).toFixed(2));
  if (noiseIndex >= 0) weights.push("0.5");

  const fadeOutStart = Math.max(durationSec - 2.5, 0);
  const filters: string[] = [
    `${labels.join("")}amix=inputs=${labels.length}:duration=longest:weights=${weights.join(" ")}[mixed]`,
  ];

  let stage = "[mixed]";
  if (tremoloHz) {
    filters.push(`${stage}tremolo=f=${tremoloHz}:d=0.5[trem]`);
    stage = "[trem]";
  }
  if (lowpassHz) {
    filters.push(`${stage}lowpass=f=${lowpassHz}[lp]`);
    stage = "[lp]";
  }
  filters.push(`${stage}afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutStart}:d=2.5,volume=0.22[out]`);

  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[out]",
      "-ar",
      "44100",
      "-ac",
      "2",
      outPath,
    ],
    { stdio: "pipe" }
  );
}

export function transcodeToMp3(wavPath: string, mp3Path: string) {
  mkdirSync(path.dirname(mp3Path), { recursive: true });
  execFileSync(
    "ffmpeg",
    ["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "192k", mp3Path],
    { stdio: "pipe" }
  );
}

export function probeDurationSeconds(filePath: string): number {
  const output = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { encoding: "utf-8" }
  );
  return Math.round(parseFloat(output.trim()));
}

const GRADIENT_PAIRS: Array<[string, string]> = [
  ["#3a2b1a", "#0a0a0b"],
  ["#1a2b2b", "#0a0a0b"],
  ["#2b1a2b", "#0a0a0b"],
  ["#1a2b1f", "#0a0a0b"],
  ["#2b1a1a", "#0a0a0b"],
  ["#1a1f2b", "#0a0a0b"],
  ["#3a2410", "#0a0a0b"],
  ["#122b26", "#0a0a0b"],
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic, brand-consistent gradient cover art with a title label. */
export async function generateCoverArt(seed: string, label: string, size = 1024): Promise<Buffer> {
  const idx = hashSeed(seed) % GRADIENT_PAIRS.length;
  const [from, to] = GRADIENT_PAIRS[idx];
  const angle = (hashSeed(seed + "a") % 360).toFixed(0);
  const shapeSeed = hashSeed(seed + "b");
  const cx = size * (0.3 + (shapeSeed % 40) / 100);
  const cy = size * (0.3 + ((shapeSeed >> 4) % 40) / 100);
  const r = size * (0.35 + ((shapeSeed >> 8) % 20) / 100);

  const svg = `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
      <radialGradient id="r" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#e3a857" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#e3a857" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#r)"/>
    <circle cx="${size * 0.78}" cy="${size * 0.82}" r="${size * 0.16}" fill="none" stroke="#f5f4f1" stroke-opacity="0.08" stroke-width="${size * 0.012}"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .resize(size, size)
    .composite([])
    .jpeg({ quality: 88 })
    .toBuffer()
    .then(async (base) => {
      // Overlay label text using a second SVG pass (sharp text layout is limited, so keep it minimal).
      const textSvg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text x="${size * 0.08}" y="${size * 0.92}" font-family="sans-serif" font-size="${size * 0.045}" fill="#f5f4f1" fill-opacity="0.85" font-weight="600">${escapeXml(label)}</text>
      </svg>`;
      return sharp(base)
        .composite([{ input: Buffer.from(textSvg) }])
        .jpeg({ quality: 88 })
        .toBuffer();
    });
}

/** Circular-safe avatar art (abstract gradient + initials) for demo artists. */
export async function generateAvatarArt(seed: string, initials: string, size = 512): Promise<Buffer> {
  const idx = hashSeed(seed) % GRADIENT_PAIRS.length;
  const [from, to] = GRADIENT_PAIRS[(idx + 3) % GRADIENT_PAIRS.length];

  const svg = `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.34}" fill="none" stroke="#e3a857" stroke-opacity="0.4" stroke-width="${size * 0.02}"/>
    <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${size * 0.24}" fill="#f5f4f1" font-weight="700">${escapeXml(initials)}</text>
  </svg>`;

  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export { TMP_DIR };
