import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getTrackBySlug } from "@/lib/queries";
import { resolveTrackCoverUrl } from "@/lib/media/entity-images";
import { formatDuration } from "@/lib/utils";

/**
 * The link preview for a shared song: artwork, title, creator and a clear
 * "listen" cue, sized for the wide cards WhatsApp, iMessage, X and Facebook
 * show. Rendered as JPEG rather than ImageResponse's PNG: a photographic
 * PNG this size runs to several hundred KB, and WhatsApp drops previews
 * whose image is too large.
 */

export const alt = "Song artwork, title and creator on Vibe Banger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const ACCENT = "#e3a857";
const CANVAS = "#0a0a0b";

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Bold.ttf")),
]);

async function loadCover(url: string | null) {
  if (!url) return null;
  try {
    const absolute = url.startsWith("http") ? url : new URL(url, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").toString();
    const res = await fetch(absolute, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const source = Buffer.from(await res.arrayBuffer());
    // sharp normalises whatever format the CDN negotiated (WebP, AVIF…) into
    // JPEG, which the renderer can embed.
    const [cover, backdrop] = await Promise.all([
      sharp(source).resize(470, 470, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer(),
      sharp(source).resize(300, 158, { fit: "cover" }).blur(18).modulate({ brightness: 0.55, saturation: 1.2 }).jpeg({ quality: 80 }).toBuffer(),
    ]);
    const dataUrl = (b: Buffer) => `data:image/jpeg;base64,${b.toString("base64")}`;
    return { cover: dataUrl(cover), backdrop: dataUrl(backdrop) };
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) return new Response("Not found", { status: 404 });

  const [[medium, bold], images] = await Promise.all([fonts, loadCover(resolveTrackCoverUrl(track, "large"))]);

  const title = track.title.length > 70 ? `${track.title.slice(0, 68).trimEnd()}…` : track.title;
  const titleSize = title.length > 40 ? 50 : title.length > 22 ? 60 : 72;
  const label = track.aiDisclosure === "HUMAN_CREATED" ? "Song" : track.aiDisclosure === "AI_ASSISTED" ? "AI-assisted song" : "AI-composed song";

  const png = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: CANVAS, fontFamily: "Jakarta" }}>
        {images ? (
          <img src={images.backdrop} width={1200} height={630} style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }} alt="" />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: `radial-gradient(circle at 25% 40%, rgba(227,168,87,0.35), transparent 55%), ${CANVAS}`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(10,10,11,0.25) 0%, rgba(10,10,11,0.55) 45%, rgba(10,10,11,0.85) 100%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%", padding: "80px", position: "relative" }}>
          {images ? (
            <img
              src={images.cover}
              width={470}
              height={470}
              style={{ borderRadius: 28, boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 470,
                height: 470,
                borderRadius: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #2a2118, #111113)",
              }}
            >
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", marginLeft: 60, flex: 1, height: 470, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: ACCENT, display: "flex" }} />
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 6, color: "#f5f5f4", display: "flex" }}>VIBE BANGER</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: 4, color: ACCENT, textTransform: "uppercase", display: "flex" }}>{label}</div>
              <div style={{ fontSize: titleSize, fontWeight: 700, color: "#fafaf9", lineHeight: 1.08, marginTop: 14, letterSpacing: -1, display: "flex" }}>
                {title}
              </div>
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
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#1a1305">
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                </svg>
                Listen now
              </div>
              <div style={{ fontSize: 28, fontWeight: 500, color: "rgba(250,250,249,0.6)", display: "flex" }}>{formatDuration(track.duration)}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Jakarta", data: medium, weight: 500, style: "normal" },
        { name: "Jakarta", data: bold, weight: 700, style: "normal" },
      ],
    }
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": contentType,
      // Crawlers fetch this once per share; artwork rarely changes.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
