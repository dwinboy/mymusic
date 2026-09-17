import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { PUBLIC_ARTIST_WHERE, PUBLIC_TRACK_WHERE } from "@/lib/public-scope";
import { BROWSABLE_KINDS, kindIndexHref, termHref } from "@/lib/taxonomy";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Built at request time, not deploy time: the catalogue changes whenever an
// admin publishes, and the build environment has no database connection.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tracks, albums, artists, playlists, terms] = await Promise.all([
    db.track.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.album.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    // Unapproved creator profiles must not be submitted for indexing.
    db.artist.findMany({ where: PUBLIC_ARTIST_WHERE, select: { slug: true, updatedAt: true } }),
    db.playlist.findMany({ where: { isPublic: true }, select: { slug: true, updatedAt: true } }),
    // Genre, mood, activity and occasion pages — the discovery pages people
    // search for ("sleep music"). Only terms that actually have music.
    db.taxonomyTerm.findMany({
      where: { kind: { in: [...BROWSABLE_KINDS] }, isActive: true, tracks: { some: { track: PUBLIC_TRACK_WHERE } } },
      select: { kind: true, slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/discover`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/new-releases`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/songs`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/albums`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/artists`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/playlists`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/search`, changeFrequency: "monthly", priority: 0.3 },
    ...BROWSABLE_KINDS.map((kind) => ({
      url: `${SITE_URL}${kindIndexHref(kind)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return [
    ...staticRoutes,
    ...tracks.map((t) => ({
      url: `${SITE_URL}/song/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...albums.map((a) => ({
      url: `${SITE_URL}/album/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...artists.map((a) => ({
      url: `${SITE_URL}/artist/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...playlists.map((p) => ({
      url: `${SITE_URL}/playlist/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...terms.flatMap((t) => {
      const href = termHref(t.kind, t.slug);
      return href
        ? [{ url: `${SITE_URL}${href}`, lastModified: t.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 }]
        : [];
    }),
  ];
}
