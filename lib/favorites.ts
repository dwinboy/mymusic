import { db } from "@/lib/db";

export async function getLikedTrackIds(
  userId: string | undefined,
  trackIds: string[]
): Promise<Set<string>> {
  if (!userId || trackIds.length === 0) return new Set();

  const rows = await db.favorite.findMany({
    where: { userId, trackId: { in: trackIds } },
    select: { trackId: true },
  });

  return new Set(rows.map((r) => r.trackId));
}
