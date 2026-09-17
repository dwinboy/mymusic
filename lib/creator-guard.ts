import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Ownership checks for everything under /api/creator. Every lookup filters by
 * the signed-in user *inside the query* rather than fetching a record and
 * comparing owners afterwards, so an id belonging to someone else behaves
 * exactly like an id that doesn't exist: the caller learns nothing and can do
 * nothing with it.
 *
 * Admins get no bypass here. They moderate through /api/admin; if an admin
 * wants to publish as a creator they own a profile like anyone else.
 */

export async function requireUser() {
  const session = await auth();
  return session?.user?.id ? { userId: session.user.id, session } : null;
}

export async function getOwnedArtists(userId: string) {
  return db.artist.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } });
}

export async function requireOwnedArtist(artistId: string) {
  const user = await requireUser();
  if (!user || !artistId) return null;
  const artist = await db.artist.findFirst({ where: { id: artistId, ownerId: user.userId } });
  return artist ? { ...user, artist } : null;
}

export async function requireOwnedTrack(trackId: string) {
  const user = await requireUser();
  if (!user || !trackId) return null;
  const track = await db.track.findFirst({ where: { id: trackId, artist: { ownerId: user.userId } } });
  return track ? { ...user, track } : null;
}

export async function requireOwnedAlbum(albumId: string) {
  const user = await requireUser();
  if (!user || !albumId) return null;
  const album = await db.album.findFirst({ where: { id: albumId, artist: { ownerId: user.userId } } });
  return album ? { ...user, album } : null;
}
