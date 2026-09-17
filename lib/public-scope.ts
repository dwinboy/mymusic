import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * What the public is allowed to see, defined once.
 *
 * A track is public when published and playable. An artist is public only
 * when it has at least one public track — which, for a creator profile, means
 * an admin has approved something from it. That ties profile visibility to
 * track moderation instead of needing a second review queue: a newly created
 * profile, whatever its name, bio or avatar, isn't listed, searchable,
 * indexed or viewable until then.
 */
export const PUBLIC_TRACK_WHERE = {
  isPublished: true,
  processingStatus: "READY",
} satisfies Prisma.TrackWhereInput;

export const PUBLIC_ARTIST_WHERE = {
  tracks: { some: PUBLIC_TRACK_WHERE },
} satisfies Prisma.ArtistWhereInput;
