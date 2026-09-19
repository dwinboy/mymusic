"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlayerTrack } from "@/lib/types";
import { getOfflineTrack } from "@/lib/offline/db";
import { downloadTrackForOffline, removeOfflineDownload, type DownloadStatus } from "@/lib/offline/manager";

export function useOfflineTrack(track: PlayerTrack) {
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getOfflineTrack(track.id)
      .then((record) => {
        if (!cancelled && record) setStatus("downloaded");
      })
      .catch(() => {
        // IndexedDB unavailable (private mode, etc.) — leave status as idle.
      });
    return () => {
      cancelled = true;
    };
  }, [track.id]);

  /** Resolves true when the track is saved, false when it failed. */
  const download = useCallback(
    async (onProgress?: (percent: number) => void) => {
      setStatus("downloading");
      setProgress(0);
      try {
        await downloadTrackForOffline(track, (percent) => {
          setProgress(percent);
          onProgress?.(percent);
        });
        setStatus("downloaded");
        return true;
      } catch {
        setStatus("failed");
        return false;
      }
    },
    [track]
  );

  const remove = useCallback(async () => {
    await removeOfflineDownload(track);
    setStatus("idle");
  }, [track]);

  return { status, progress, download, remove };
}
