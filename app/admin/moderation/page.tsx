import { ModerationQueue, type QueueItem } from "@/components/admin/moderation-queue";
import { db } from "@/lib/db";
import { getStreamingUrl } from "@/lib/media/audio-service";
import { resolveImageUrl } from "@/lib/media/image-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue" };

const KIND_LABEL: Record<string, string> = {
  GENRE: "Genre",
  MOOD: "Mood",
  ACTIVITY: "Activities",
  OCCASION: "Occasions",
  VOCAL: "Vocals",
  LANGUAGE: "Language",
  INSTRUMENT: "Instruments",
  TAG: "Tags",
};

export default async function AdminModerationPage() {
  // The admin layout already requires the ADMIN role for everything here.
  const tracks = await db.track.findMany({
    where: { moderationStatus: "PENDING_REVIEW" },
    orderBy: { submittedAt: "asc" },
    take: 100,
    include: {
      artist: { select: { name: true, owner: { select: { email: true } } } },
      album: { select: { title: true, coverUrl: true, coverImagePublicId: true } },
      terms: { select: { isPrimary: true, term: { select: { name: true, kind: true } } }, orderBy: { isPrimary: "desc" } },
    },
  });

  const items: QueueItem[] = tracks.map((track) => ({
    id: track.id,
    title: track.title,
    artistName: track.artist.name,
    ownerEmail: track.artist.owner?.email ?? null,
    albumTitle: track.album?.title ?? null,
    coverUrl: resolveImageUrl(
      { publicId: track.coverImagePublicId ?? track.album?.coverImagePublicId, fallbackUrl: track.coverUrl ?? track.album?.coverUrl ?? null },
      "small"
    ),
    previewUrl: getStreamingUrl(track),
    duration: track.duration,
    description: track.description,
    lyrics: track.lyrics,
    isExplicit: track.isExplicit,
    aiDisclosure: track.aiDisclosure,
    aiTool: track.aiTool,
    aiDetails: track.aiDetails,
    energy: track.energy,
    submittedAt: track.submittedAt?.toISOString() ?? null,
    rightsConfirmedAt: track.rightsConfirmedAt?.toISOString() ?? null,
    resubmission: !!track.reviewedAt,
    terms: Object.entries(KIND_LABEL).flatMap(([kind, label]) => {
      const names = track.terms.filter((t) => t.term.kind === kind).map((t) => t.term.name);
      return names.length ? [{ kind: label, names }] : [];
    }),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Review queue</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {items.length === 0
          ? "Creator submissions waiting for a decision, oldest first."
          : `${items.length} ${items.length === 1 ? "submission" : "submissions"} waiting, oldest first. Approving publishes the track immediately.`}
      </p>
      <div className="mt-6">
        <ModerationQueue items={items} />
      </div>
    </div>
  );
}
