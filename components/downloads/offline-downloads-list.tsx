"use client";

import { useEffect, useState } from "react";
import { Trash2, Download, WifiOff } from "lucide-react";
import { TrackArt } from "@/components/player/track-art";
import { PlayButton } from "@/components/player/play-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAllOfflineTracks, clearAllOfflineTracks, type OfflineTrackRecord } from "@/lib/offline/db";
import { removeOfflineDownload } from "@/lib/offline/manager";
import { offlinePlayerTrack } from "@/lib/offline/covers";
import { clearAudioCache } from "@/lib/offline/audio-cache";
import { formatDuration, formatFileSize } from "@/lib/utils";

export function OfflineDownloadsList() {
  const [records, setRecords] = useState<OfflineTrackRecord[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getAllOfflineTracks()
      .then(setRecords)
      .catch(() => setRecords([]));
  }, []);

  async function removeOne(record: OfflineTrackRecord) {
    setRecords((prev) => prev?.filter((r) => r.track.id !== record.track.id) ?? null);
    await removeOfflineDownload(record.track);
  }

  async function removeAll() {
    if (!confirm("Remove all offline downloads from this device?")) return;
    setRecords([]);
    await Promise.all([clearAllOfflineTracks(), clearAudioCache()]);
    toast({ title: "All offline downloads removed" });
  }

  if (records === null) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={Download}
        title="No offline downloads yet"
        description="Download any track from its song page — it'll play here even without a connection."
        actionLabel="Discover music"
        actionHref="/discover"
      />
    );
  }

  const totalBytes = records.reduce((sum, r) => sum + r.byteSize, 0);
  const queue = records.map(offlinePlayerTrack);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
          <WifiOff className="h-3.5 w-3.5" /> {formatFileSize(totalBytes)} stored on this device
        </p>
        <Button variant="ghost" size="sm" onClick={removeAll} className="text-foreground-muted">
          Remove all
        </Button>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {records.map((record, index) => (
          <div key={record.track.id} className="flex items-center gap-3 py-3">
            <TrackArt src={queue[index].coverUrl} alt={record.track.title} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{record.track.title}</p>
              <p className="truncate text-xs text-foreground-muted">{record.track.artistName}</p>
            </div>
            <span className="tabular hidden text-xs text-foreground-subtle sm:inline">
              {formatDuration(record.track.duration)}
            </span>
            <span className="hidden text-xs text-foreground-subtle sm:inline">{formatFileSize(record.byteSize)}</span>
            <PlayButton track={queue[index]} queue={queue} size="sm" />
            <button
              onClick={() => removeOne(record)}
              aria-label={`Remove ${record.track.title} from offline downloads`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
