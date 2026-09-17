"use client";

import Link from "next/link";
import { MoreHorizontal, ListPlus, ListEnd, ListMusic, Download, Share2, Disc3, Mic2, ListX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useToast } from "@/hooks/use-toast";
import { useOfflineTrack } from "@/hooks/use-offline-track";
import { AddToPlaylistDialog } from "@/components/music/add-to-playlist-dialog";
import type { PlayerTrack } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TrackMenu({
  track,
  className,
  removeFromPlaylistId,
  onRemovedFromPlaylist,
}: {
  track: PlayerTrack;
  className?: string;
  /** When set, shows a "Remove from this playlist" action (owner-only context). */
  removeFromPlaylistId?: string;
  onRemovedFromPlaylist?: () => void;
}) {
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const { toast } = useToast();
  const { status: downloadStatus, download } = useOfflineTrack(track);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="More options"
          className={cn(
            // Comfortably tappable on touch, tighter on desktop where the
            // pointer is precise and rows should stay dense.
            "flex h-10 w-10 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground md:h-8 md:w-8",
            className
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onSelect={() => {
            playNext(track);
            toast({ title: "Playing next" });
          }}
        >
          <ListEnd className="h-4 w-4" /> Play next
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            addToQueue(track);
            toast({ title: "Added to queue" });
          }}
        >
          <ListPlus className="h-4 w-4" /> Add to queue
        </DropdownMenuItem>
        <AddToPlaylistDialog
          trackId={track.id}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <ListMusic className="h-4 w-4" /> Add to playlist
            </DropdownMenuItem>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/artist/${track.artistSlug}`}>
            <Mic2 className="h-4 w-4" /> Go to artist
          </Link>
        </DropdownMenuItem>
        {track.albumSlug && (
          <DropdownMenuItem asChild>
            <Link href={`/album/${track.albumSlug}`}>
              <Disc3 className="h-4 w-4" /> Go to album
            </Link>
          </DropdownMenuItem>
        )}
        {track.downloadEnabled && downloadStatus !== "downloaded" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await download();
                toast({ title: "Downloaded for offline listening" });
              }}
            >
              <Download className="h-4 w-4" /> Download
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem
          onSelect={async () => {
            const url = `${window.location.origin}/song/${track.slug}`;
            if (navigator.share) {
              navigator.share({ title: track.title, url }).catch(() => {});
            } else {
              await navigator.clipboard.writeText(url);
              toast({ title: "Link copied" });
            }
          }}
        >
          <Share2 className="h-4 w-4" /> Share
        </DropdownMenuItem>
        {removeFromPlaylistId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={async () => {
                await fetch(`/api/playlists/${removeFromPlaylistId}/tracks?trackId=${track.id}`, {
                  method: "DELETE",
                });
                toast({ title: "Removed from playlist" });
                onRemovedFromPlaylist?.();
              }}
            >
              <ListX className="h-4 w-4" /> Remove from this playlist
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
