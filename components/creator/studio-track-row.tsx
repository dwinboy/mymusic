import Link from "next/link";
import Image from "next/image";
import { Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_META, type CreatorTrackStatus } from "@/lib/creator-status";
import { formatDuration } from "@/lib/utils";

export interface StudioTrack {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  artistName: string;
  albumTitle: string | null;
  duration: number;
  status: CreatorTrackStatus;
  note: string | null;
  plays: number;
}

export function StudioTrackRow({ track, actions }: { track: StudioTrack; actions?: React.ReactNode }) {
  const meta = STATUS_META[track.status];
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors sm:gap-4 sm:px-3 can-hover:hover:bg-surface/60">
      <Link href={`/creator/tracks/${track.id}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-foreground-subtle">
          {track.coverUrl ? <Image src={track.coverUrl} alt="" fill sizes="48px" className="object-cover" /> : <Music2 className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{track.title}</span>
          <span className="block truncate text-sm text-foreground-muted">
            {track.artistName}
            {track.albumTitle && ` · ${track.albumTitle}`}
          </span>
          {track.note && track.status === "changes" && (
            <span className="mt-0.5 block truncate text-xs text-danger">{track.note}</span>
          )}
        </span>
      </Link>
      <span className="hidden w-16 text-right text-sm text-foreground-muted tabular sm:block">{formatDuration(track.duration)}</span>
      <span className="hidden w-20 text-right text-sm text-foreground-muted tabular md:block">
        {track.status === "live" ? track.plays.toLocaleString() : "—"}
      </span>
      <span className="flex shrink-0 justify-end md:w-40">
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </span>
      {actions}
    </div>
  );
}
