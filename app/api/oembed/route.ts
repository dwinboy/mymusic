import { NextResponse } from "next/server";
import { getTrackBySlug } from "@/lib/queries";
import { resolveTrackCoverUrl } from "@/lib/media/entity-images";

const EMBED_HEIGHT = 152;

/** oEmbed consumers fetch thumbnails from their own servers, so the URL must be absolute. */
function absolute(url: string | null, site: string) {
  if (!url) return undefined;
  return url.startsWith("http") ? url : new URL(url, site).toString();
}

/**
 * oEmbed for song links, so editors that support it (WordPress, Notion,
 * Ghost, iframely-based tools…) turn a pasted Vibe Banger link into the
 * player. Discovered from the <link rel="alternate"> on song pages.
 *
 *   GET /api/oembed?url=https://vibebanger.com/song/<slug>
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if ((params.get("format") ?? "json") !== "json") {
    return NextResponse.json({ error: "Only JSON is supported" }, { status: 501 });
  }

  let slug: string | undefined;
  try {
    const target = new URL(params.get("url") ?? "");
    slug = /^\/song\/([^/]+)\/?$/.exec(target.pathname)?.[1];
  } catch {
    // Falls through to 404.
  }
  const track = slug ? await getTrackBySlug(decodeURIComponent(slug)) : null;
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const maxWidth = Number(params.get("maxwidth")) || 0;
  const width = maxWidth > 0 ? Math.min(maxWidth, 640) : 640;
  const src = `${site}/embed/song/${track.slug}`;

  return NextResponse.json(
    {
      version: "1.0",
      type: "rich",
      provider_name: "Vibe Banger",
      provider_url: site,
      title: `${track.title} — ${track.artist.name}`,
      author_name: track.artist.name,
      author_url: `${site}/artist/${track.artist.slug}`,
      thumbnail_url: absolute(resolveTrackCoverUrl(track, "medium"), site),
      thumbnail_width: 500,
      thumbnail_height: 500,
      width,
      height: EMBED_HEIGHT,
      html: `<iframe src="${src}" width="100%" height="${EMBED_HEIGHT}" style="border:0;border-radius:12px;max-width:${width}px" allow="autoplay; encrypted-media" loading="lazy" title="${track.title.replace(/"/g, "&quot;")} on Vibe Banger"></iframe>`,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
