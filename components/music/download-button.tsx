"use client";

import { useSession } from "next-auth/react";
import { Download, Check, Loader2, AlertCircle } from "lucide-react";
import { useOfflineTrack } from "@/hooks/use-offline-track";
import { cn } from "@/lib/utils";
import type { PlayerTrack } from "@/lib/types";

export function DownloadButton({
  track,
  size = "md",
  className,
  showLabel = false,
}: {
  track: PlayerTrack;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}) {
  const { data: session } = useSession();
  const { status, progress, download, remove } = useOfflineTrack(track);

  const iconSize = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }[size];

  // Not gated on downloadEnabled. This button saves the streaming encode into
  // the app's own cache so the track plays with no connection — it hands out
  // no file and leaves nothing outside the app. That flag governs the
  // downloadable file URL, which is a different thing entirely.

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (status === "downloading") return;

    if (status === "downloaded") {
      await remove();
      return;
    }

    await download();

    if (session?.user) {
      fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id }),
      }).catch(() => {});
    }
  }

  const label =
    status === "downloading"
      ? `Downloading… ${progress}%`
      : status === "downloaded"
        ? "Downloaded — tap to remove"
        : status === "failed"
          ? "Download failed — tap to retry"
          : "Download for offline listening";

  return (
    <button
      onClick={handleClick}
      disabled={status === "downloading"}
      aria-label={`${label}: ${track.title}`}
      title={label}
      className={cn(
        "flex items-center justify-center gap-2 rounded-full text-foreground-muted transition-colors hover:text-foreground disabled:opacity-60",
        showLabel && "px-1",
        className
      )}
    >
      {status === "downloading" ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : status === "downloaded" ? (
        <Check className={cn(iconSize, "text-success")} />
      ) : status === "failed" ? (
        <AlertCircle className={cn(iconSize, "text-danger")} />
      ) : (
        <Download className={iconSize} />
      )}
      {showLabel && (
        <span className="text-sm">
          {status === "downloading"
            ? `Downloading ${progress}%`
            : status === "downloaded"
              ? "Downloaded"
              : status === "failed"
                ? "Retry download"
                : "Download"}
        </span>
      )}
    </button>
  );
}
