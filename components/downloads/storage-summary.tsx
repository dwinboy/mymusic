"use client";

import { useEffect, useState } from "react";
import { HardDrive, ShieldCheck, ShieldAlert } from "lucide-react";
import { getStorageState, formatBytes, type StorageState } from "@/lib/offline/persistence";
import { getAllOfflineTracks } from "@/lib/offline/db";
import { cn } from "@/lib/utils";

/**
 * How much of this device the downloads are using, and whether they are safe
 * from the browser clearing them out.
 *
 * Every player that keeps music on a device says this. Without it "Downloads"
 * is a list with no sense of cost or of how much more will fit, and the
 * eviction risk — real when storage isn't persisted — is invisible until the
 * music is already gone.
 *
 * Renders nothing at all when the browser won't report storage, rather than
 * showing zeroes that read as "nothing saved" — and nothing when there are no
 * downloads, since the figure would then be the app's own shell rather than
 * any music, sitting above an empty state that already says so.
 */
export function StorageSummary({ className }: { className?: string }) {
  const [state, setState] = useState<StorageState | null>(null);
  /** Bytes of music, which is the part someone can act on by deleting it. */
  const [musicBytes, setMusicBytes] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStorageState(), getAllOfflineTracks().catch(() => [])]).then(([storage, tracks]) => {
      if (cancelled) return;
      setState(storage);
      setMusicBytes(tracks.length > 0 ? tracks.reduce((sum, t) => sum + (t.byteSize ?? 0), 0) : null);
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked || musicBytes === null || !state || state.usage === null) return null;

  const { usage, quota, persisted } = state;
  const percent = quota && quota > 0 ? Math.min(100, (usage / quota) * 100) : null;
  const free = quota !== null ? Math.max(0, quota - usage) : null;

  return (
    <div className={cn("rounded-xl border border-border bg-surface/40 p-4", className)}>
      {/* The headline is the music, not the origin's total usage: that figure
          also counts the app shell and cached pages, which nobody put here on
          purpose and nobody can remove from this page. */}
      {/* Two lines rather than one that wraps: at phone width a trailing
          clause breaks onto its own line and any separator left in front of
          it reads as a stray bullet. */}
      <div className="flex items-start gap-2">
        <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{formatBytes(musicBytes)} of music saved</p>
          {free !== null && (
            <p className="mt-0.5 text-xs text-foreground-muted">{formatBytes(free)} free on this device</p>
          )}
        </div>
      </div>

      {percent !== null && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-active"
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Device storage used by downloads"
        >
          {/* A hairline still reads as "something is saved" when the share of a
              64GB phone is far below one percent. */}
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(percent, 0.5)}%` }} />
        </div>
      )}

      <p className="mt-3 flex items-start gap-2 text-xs text-foreground-muted">
        {persisted ? (
          <>
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-success" />
            <span>Protected — this browser won&apos;t clear your downloads to free up space.</span>
          </>
        ) : (
          <>
            <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
            <span>
              Your browser may clear these if the device runs low on space. Installing the app makes them
              permanent.
            </span>
          </>
        )}
      </p>
    </div>
  );
}
