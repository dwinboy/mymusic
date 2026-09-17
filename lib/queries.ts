import { db } from "@/lib/db";
import { TERM_SELECT } from "@/lib/taxonomy";
import { PUBLIC_ARTIST_WHERE } from "@/lib/public-scope";

const TRACK_TERMS_INCLUDE = {
  terms: {
    where: { term: { isActive: true } },
    orderBy: [{ isPrimary: "desc" as const }, { term: { displayOrder: "asc" as const } }],
    select: { isPrimary: true, term: { select: TERM_SELECT } },
  },
};

export function getTrackBySlug(slug: string) {
  return db.track.findFirst({
    where: { slug, isPublished: true },
    include: { artist: true, album: true, ...TRACK_TERMS_INCLUDE },
  });
}

export function getAlbumBySlug(slug: string) {
  return db.album.findFirst({
    where: { slug, isPublished: true },
    include: {
      artist: true,
      tracks: {
        where: { isPublished: true },
        orderBy: { trackNumber: "asc" },
        include: { artist: true, album: true, ...TRACK_TERMS_INCLUDE },
      },
    },
  });
}

/** Public profile — null until the artist has something published. */
export function getArtistBySlug(slug: string) {
  return db.artist.findFirst({ where: { slug, ...PUBLIC_ARTIST_WHERE } });
}

export function getPlaylistBySlug(slug: string) {
  return db.playlist.findFirst({
    where: { slug },
    include: {
      user: true,
      tracks: {
        orderBy: { position: "asc" },
        include: { track: { include: { artist: true, album: true } } },
      },
    },
  });
}
