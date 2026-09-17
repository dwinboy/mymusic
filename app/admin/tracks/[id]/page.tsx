import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { TrackForm, type TrackFormInitial } from "@/components/admin/track-form";
import { TrackDetailActions } from "@/components/admin/track-detail-actions";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";

export const metadata = { title: "Edit Track" };

export default async function EditTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [track, playCount] = await Promise.all([
    db.track.findUnique({
      where: { id },
      include: {
        artist: true,
        album: true,
        terms: { select: { termId: true, isPrimary: true, term: { select: { kind: true } } } },
      },
    }),
    db.listeningHistory.count({ where: { trackId: id } }),
  ]);
  if (!track) notFound();

  const initial: TrackFormInitial = {
    id: track.id,
    title: track.title,
    artistId: track.artistId,
    albumId: track.albumId,
    description: track.description,
    lyrics: track.lyrics,
    credits: track.credits,
    composer: track.composer,
    producer: track.producer,
    releaseDate: track.releaseDate ? track.releaseDate.toISOString() : null,
    isAiGenerated: track.isAiGenerated,
    isExplicit: track.isExplicit,
    isPublished: track.isPublished,
    isFeatured: track.isFeatured,
    downloadEnabled: track.downloadEnabled,
    genreIds: track.terms.filter((t) => t.term.kind === "GENRE").map((t) => t.termId),
    coverUrl: track.coverUrl,
    duration: track.duration,
    fileSize: track.fileSize,
    mimeType: track.mimeType,
    processingStatus: track.processingStatus,
    processingError: track.processingError,
  };

  const playerTrack = toPlayerTrack(track);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{track.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {playCount} plays · {track.downloadCount} downloads
          </p>
        </div>
        <TrackDetailActions track={playerTrack} songUrl={`/song/${track.slug}`} />
      </div>

      <div className="mt-8">
        <TrackForm initial={initial} imageCloudinaryEnabled={isImageCloudinaryEnabled()} />
      </div>
    </div>
  );
}
