import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LyricsTimer } from "@/components/creator/lyrics-timer";
import { getCreatorContext } from "@/lib/creator-session";
import { db } from "@/lib/db";
import { getStreamingUrl } from "@/lib/media/audio-service";
import { parseLyrics } from "@/lib/lyrics";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Time the lyrics" };

export default async function TimeLyricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profileIds } = await getCreatorContext(`/creator/tracks/${id}/lyrics`);

  // Ownership is part of the query, so someone else's track is a 404.
  const track = await db.track.findFirst({ where: { id, artistId: { in: profileIds } } });
  if (!track) notFound();

  const audioUrl = getStreamingUrl(track);
  const parsed = parseLyrics(track.lyrics);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <Link
        href={`/creator/tracks/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {track.title}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Time the lyrics</h1>
      <p className="mt-2 max-w-prose text-sm text-foreground-muted">
        Play the song and tap once as each line starts. Listeners then get lyrics that follow along and can tap any
        line to jump to it — the thing that makes a song feel like it was made for being read as well as heard.
      </p>

      <div className="mt-8">
        {!parsed.plain ? (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-medium text-foreground">This track has no lyrics yet</p>
            <p className="mt-1.5 text-sm text-foreground-muted">
              Write them on the track first, then come back and tap them into time.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/creator/tracks/${id}`}>Add the lyrics</Link>
            </Button>
          </div>
        ) : !audioUrl ? (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-medium text-foreground">This track has no audio to play against</p>
            <p className="mt-1.5 text-sm text-foreground-muted">
              Timing needs the song itself. Once the audio has finished processing, this will work.
            </p>
          </div>
        ) : (
          <LyricsTimer trackId={track.id} title={track.title} audioUrl={audioUrl} lyrics={track.lyrics ?? ""} />
        )}
      </div>
    </div>
  );
}
