import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PublishFlow, type PublishTrack } from "@/components/creator/publish-flow";
import { Badge } from "@/components/ui/badge";
import { getCreatorContext } from "@/lib/creator-session";
import { creatorTrackStatus, STATUS_META } from "@/lib/creator-status";
import { db } from "@/lib/db";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";
import { isAudioR2Enabled } from "@/lib/media/audio-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit track" };

export default async function CreatorTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profiles, profileIds } = await getCreatorContext(`/creator/tracks/${id}`);

  // Scoped by ownership in the query itself: someone else's track is a 404,
  // indistinguishable from one that doesn't exist.
  const track = await db.track.findFirst({
    where: { id, artistId: { in: profileIds } },
    include: { terms: { select: { isPrimary: true, term: { select: { id: true, kind: true } } } } },
  });
  if (!track) notFound();

  const status = creatorTrackStatus(track);
  const initial: PublishTrack = {
    id: track.id,
    title: track.title,
    artistId: track.artistId,
    albumId: track.albumId,
    description: track.description,
    lyrics: track.lyrics,
    credits: track.credits,
    composer: track.composer,
    producer: track.producer,
    releaseDate: track.releaseDate?.toISOString() ?? null,
    isExplicit: track.isExplicit,
    downloadEnabled: track.downloadEnabled,
    aiDisclosure: track.aiDisclosure,
    aiTool: track.aiTool,
    aiDetails: track.aiDetails,
    energy: track.energy,
    tempoBpm: track.tempoBpm,
    rightsConfirmedAt: track.rightsConfirmedAt?.toISOString() ?? null,
    moderationStatus: track.moderationStatus,
    moderationNote: track.moderationNote,
    processingStatus: track.processingStatus,
    processingError: track.processingError,
    duration: track.duration,
    originalFormat: track.originalFormat,
    originalSize: track.originalSize,
    coverImagePublicId: track.coverImagePublicId,
    coverImageUrl: track.coverImageUrl,
    coverUrl: track.coverUrl,
    terms: track.terms,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 md:py-10">
      <Link href="/creator/music" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My music
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 truncate text-3xl font-semibold tracking-tight text-foreground">{track.title}</h1>
        <Badge variant={STATUS_META[status].variant}>{STATUS_META[status].label}</Badge>
      </div>
      {status === "live" && (
        <Link
          href={`/song/${track.slug}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          View on Vibe Banger <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
      <div className="mt-8">
        <PublishFlow
          profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
          initialTrack={initial}
          imageUploadsEnabled={isImageCloudinaryEnabled()}
          audioR2Enabled={isAudioR2Enabled()}
        />
      </div>
    </div>
  );
}
