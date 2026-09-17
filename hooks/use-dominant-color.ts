"use client";

import { useEffect, useState } from "react";

/**
 * Pulls a vibrant accent colour out of a track's artwork so the player can
 * tint itself per track. Deliberately returns null rather than a muddy
 * colour when the artwork has nothing usable (greyscale covers, mostly
 * black) — callers fall back to the site accent, which looks intentional.
 */

// Extraction is deterministic and tracks repeat constantly (queue loops,
// revisiting an album), so results are worth keeping for the session.
const cache = new Map<string, string | null>();

/**
 * Routed through Next's image optimizer rather than hitting the artwork host
 * directly: it's same-origin, so the canvas is never tainted no matter where
 * the image actually lives, and 64px is far more resolution than a colour
 * average needs.
 */
function sampleUrl(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=64&q=75`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

const HUE_BUCKETS = 24;

function extract(img: HTMLImageElement): string | null {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, size, size);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, size, size).data;
  } catch {
    // Tainted canvas — shouldn't happen via the optimizer, but never throw
    // over decoration.
    return null;
  }

  // Score hues by how saturated *and* how common they are, so a small patch
  // of vivid colour beats a large wash of near-grey.
  const weight = new Array(HUE_BUCKETS).fill(0);
  const satSum = new Array(HUE_BUCKETS).fill(0);
  const lightSum = new Array(HUE_BUCKETS).fill(0);
  const count = new Array(HUE_BUCKETS).fill(0);

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 125) continue;
    const [h, s, l] = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (l < 0.12 || l > 0.9 || s < 0.15) continue;

    const bucket = Math.min(HUE_BUCKETS - 1, Math.floor((h / 360) * HUE_BUCKETS));
    weight[bucket] += s * s;
    satSum[bucket] += s;
    lightSum[bucket] += l;
    count[bucket] += 1;
  }

  let best = -1;
  let bestWeight = 0;
  for (let i = 0; i < HUE_BUCKETS; i++) {
    if (weight[i] > bestWeight) {
      bestWeight = weight[i];
      best = i;
    }
  }
  if (best === -1) return null;

  const hue = (best + 0.5) * (360 / HUE_BUCKETS);
  // Clamped so every track lands somewhere legible on a near-black UI —
  // washed-out covers don't produce washed-out chrome, and neon ones don't
  // produce glare.
  const sat = Math.min(0.85, Math.max(0.45, satSum[best] / count[best]));
  const light = Math.min(0.62, Math.max(0.45, lightSum[best] / count[best]));

  return `hsl(${hue.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(light * 100).toFixed(0)}%)`;
}

export function useDominantColor(src: string | null | undefined): string | null {
  const [color, setColor] = useState<string | null>(() => (src ? cache.get(src) ?? null : null));

  useEffect(() => {
    if (!src) {
      setColor(null);
      return;
    }
    if (cache.has(src)) {
      setColor(cache.get(src) ?? null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.decoding = "async";

    img.onload = () => {
      if (cancelled) return;
      const result = extract(img);
      cache.set(src, result);
      setColor(result);
    };
    img.onerror = () => {
      if (cancelled) return;
      cache.set(src, null);
      setColor(null);
    };

    img.src = sampleUrl(src);

    return () => {
      cancelled = true;
    };
  }, [src]);

  return color;
}
