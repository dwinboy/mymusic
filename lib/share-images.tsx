import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { formatDuration } from "@/lib/utils";

/**
 * Generated share images for songs: the wide link-preview card and the tall
 * Instagram Story card. Both are rendered with next/og and re-encoded as
 * JPEG, because a photographic PNG at these sizes is several hundred KB and
 * messaging apps drop previews that large.
 */

export const ACCENT = "#e3a857";
const CANVAS = "#0a0a0b";

let fontsPromise: Promise<[Buffer, Buffer]> | null = null;
let markPromise: Promise<string> | null = null;

/**
 * The logo as a data URI. Satori has no network of its own during render, so
 * the mark is read off disk and inlined rather than fetched by URL.
 */
function loadMark() {
  markPromise ??= readFile(join(process.cwd(), "public/icons/icon-192.png")).then(
    (buffer) => `data:image/png;base64,${buffer.toString("base64")}`
  );
  return markPromise;
}

function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Bold.ttf")),
  ]);
  return fontsPromise;
}

export interface ShareImageTrack {
  title: string;
  duration: number;
  aiDisclosure: "AI_GENERATED" | "AI_ASSISTED" | "HUMAN_CREATED";
  artist: { name: string };
}

interface Artwork {
  cover: string;
  backdrop: string;
}

/** Fetches artwork in whatever format the CDN negotiates and returns JPEG data URLs sized for the card. */
async function loadArtwork(url: string | null, coverSize: number, backdrop: { width: number; height: number }): Promise<Artwork | null> {
  if (!url) return null;
  try {
    const absolute = url.startsWith("http") ? url : new URL(url, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").toString();
    const res = await fetch(absolute, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const source = Buffer.from(await res.arrayBuffer());
    const [cover, blurred] = await Promise.all([
      sharp(source).resize(coverSize, coverSize, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer(),
      // Blurred small and scaled up by the renderer: smooth, and tiny to embed.
      sharp(source)
        .resize(Math.round(backdrop.width / 4), Math.round(backdrop.height / 4), { fit: "cover" })
        .blur(18)
        .modulate({ brightness: 0.55, saturation: 1.2 })
        .jpeg({ quality: 80 })
        .toBuffer(),
    ]);
    const dataUrl = (b: Buffer) => `data:image/jpeg;base64,${b.toString("base64")}`;
    return { cover: dataUrl(cover), backdrop: dataUrl(blurred) };
  } catch {
    return null;
  }
}

function label(track: ShareImageTrack) {
  return track.aiDisclosure === "HUMAN_CREATED" ? "Song" : track.aiDisclosure === "AI_ASSISTED" ? "AI-assisted song" : "AI-composed song";
}

function clampTitle(title: string, max: number) {
  return title.length > max ? `${title.slice(0, max - 2).trimEnd()}…` : title;
}

function Backdrop({ artwork, width, height, overlay }: { artwork: Artwork | null; width: number; height: number; overlay: string }) {
  return (
    <>
      {artwork ? (
        // Rendered to an image by next/og, not the browser: next/image doesn't apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artwork.backdrop} width={width} height={height} style={{ position: "absolute", inset: 0, width, height, objectFit: "cover" }} alt="" />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `radial-gradient(circle at 30% 35%, rgba(227,168,87,0.35), transparent 55%), ${CANVAS}`,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", background: overlay }} />
    </>
  );
}

function Cover({ artwork, size, radius }: { artwork: Artwork | null; size: number; radius: number }) {
  if (artwork) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={artwork.cover} width={size} height={size} style={{ borderRadius: radius, boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }} alt="" />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2a2118, #111113)",
      }}
    >
      <svg width={size / 4} height={size / 4} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

function Brand({ size, mark }: { size: number; mark: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders
          this to a PNG; next/image has no meaning here. */}
      <img src={mark} width={size * 1.5} height={size * 1.5} style={{ borderRadius: size * 0.34 }} alt="" />
      <div style={{ fontSize: size, fontWeight: 700, letterSpacing: size * 0.25, color: "#f5f5f4", display: "flex" }}>VIBE BANGER</div>
    </div>
  );
}

function PlayGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1a1305">
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
    </svg>
  );
}

async function render(element: React.ReactElement, size: { width: number; height: number }, cacheControl: string) {
  const [medium, bold] = await loadFonts();
  const png = new ImageResponse(element, {
    ...size,
    fonts: [
      { name: "Jakarta", data: medium, weight: 500, style: "normal" },
      { name: "Jakarta", data: bold, weight: 700, style: "normal" },
    ],
  });
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": cacheControl },
  });
}

const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/** 1200×630 link preview. */
export async function songPreviewCard(track: ShareImageTrack, artworkUrl: string | null) {
  const mark = await loadMark();
  const width = 1200;
  const height = 630;
  const artwork = await loadArtwork(artworkUrl, 470, { width, height });
  const title = clampTitle(track.title, 70);
  const titleSize = title.length > 40 ? 50 : title.length > 22 ? 60 : 72;

  return render(
    <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: CANVAS, fontFamily: "Jakarta" }}>
      <Backdrop
        artwork={artwork}
        width={width}
        height={height}
        overlay="linear-gradient(90deg, rgba(10,10,11,0.25) 0%, rgba(10,10,11,0.55) 45%, rgba(10,10,11,0.85) 100%)"
      />
      <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%", padding: "80px", position: "relative" }}>
        <Cover artwork={artwork} size={470} radius={28} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 60, flex: 1, height: 470, justifyContent: "space-between" }}>
          <Brand size={24} mark={mark} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: 4, color: ACCENT, textTransform: "uppercase", display: "flex" }}>{label(track)}</div>
            <div style={{ fontSize: titleSize, fontWeight: 700, color: "#fafaf9", lineHeight: 1.08, marginTop: 14, letterSpacing: -1, display: "flex" }}>{title}</div>
            <div style={{ fontSize: 34, fontWeight: 500, color: "rgba(250,250,249,0.72)", marginTop: 16, display: "flex" }}>{track.artist.name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: ACCENT,
                color: "#1a1305",
                borderRadius: 999,
                padding: "16px 30px 16px 24px",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              <PlayGlyph size={26} />
              Listen now
            </div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "rgba(250,250,249,0.6)", display: "flex" }}>{formatDuration(track.duration)}</div>
          </div>
        </div>
      </div>
    </div>,
    { width, height },
    CACHE
  );
}

/**
 * 1080×1920 Instagram Story card. The top and bottom ~250px stay clear of
 * text, where Instagram draws its own controls and where people put the
 * link sticker.
 */
export async function songStoryCard(track: ShareImageTrack, artworkUrl: string | null) {
  const mark = await loadMark();
  const width = 1080;
  const height = 1920;
  const artwork = await loadArtwork(artworkUrl, 800, { width, height });
  const title = clampTitle(track.title, 60);
  const titleSize = title.length > 34 ? 68 : title.length > 18 ? 84 : 100;

  return render(
    <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: CANVAS, fontFamily: "Jakarta" }}>
      <Backdrop
        artwork={artwork}
        width={width}
        height={height}
        overlay="linear-gradient(180deg, rgba(10,10,11,0.35) 0%, rgba(10,10,11,0.25) 40%, rgba(10,10,11,0.8) 75%, rgba(10,10,11,0.92) 100%)"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          height: "100%",
          padding: "270px 100px 0",
          position: "relative",
        }}
      >
        <Cover artwork={artwork} size={800} radius={40} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80, width: "100%" }}>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: 6, color: ACCENT, textTransform: "uppercase", display: "flex" }}>{label(track)}</div>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              color: "#fafaf9",
              lineHeight: 1.05,
              marginTop: 22,
              letterSpacing: -2,
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 50, fontWeight: 500, color: "rgba(250,250,249,0.75)", marginTop: 20, display: "flex" }}>{track.artist.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 70 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                background: ACCENT,
                color: "#1a1305",
                borderRadius: 999,
                padding: "22px 42px 22px 34px",
                fontSize: 38,
                fontWeight: 700,
              }}
            >
              <PlayGlyph size={36} />
              Listen on Vibe Banger
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 60 }}>
            <Brand size={30} mark={mark} />
          </div>
        </div>
      </div>
    </div>,
    { width, height },
    CACHE
  );
}

/**
 * The 1200×630 card for pages that are not about one song — the homepage,
 * the commission page, About. Without it, sharing any of those on WhatsApp
 * or Facebook produced a preview with no picture at all, which on the links
 * most likely to be passed between people is the worst place to have none.
 *
 * Deliberately typographic rather than artwork-led: these pages describe the
 * catalogue rather than any single release, so picking one cover would
 * misrepresent them and would go stale the moment that track changed.
 */
export async function brandPreviewCard({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  const mark = await loadMark();
  const width = 1200;
  const height = 630;

  return render(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: CANVAS,
        fontFamily: "Jakarta",
        padding: 80,
        position: "relative",
      }}
    >
      {/* A single linear gradient, set as backgroundImage. Satori draws one
          gradient this way reliably; the two stacked radial ones it was given
          first rendered as nothing at all, leaving a flat black rectangle. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(135deg, rgba(227,168,87,0.20) 0%, rgba(227,168,87,0.04) 38%, rgba(10,10,11,0) 62%)",
          display: "flex",
        }}
      />
      <div style={{ display: "flex", position: "relative" }}>
        <Brand size={26} mark={mark} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ display: "flex", width: 64, height: 5, background: ACCENT, borderRadius: 999, marginBottom: 26 }} />
        <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: 5, color: ACCENT, textTransform: "uppercase", display: "flex" }}>
          {eyebrow}
        </div>
        <div style={{ fontSize: title.length > 34 ? 66 : 78, fontWeight: 700, color: "#fafaf9", lineHeight: 1.05, marginTop: 18, letterSpacing: -1.5, display: "flex" }}>
          {title}
        </div>
        <div style={{ fontSize: 30, fontWeight: 500, color: "rgba(250,250,249,0.7)", marginTop: 22, lineHeight: 1.35, display: "flex", maxWidth: 900 }}>
          {subtitle}
        </div>
      </div>
    </div>,
    { width, height },
    CACHE
  );
}
