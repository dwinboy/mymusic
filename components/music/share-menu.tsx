"use client";

import { useState } from "react";
import { Share2, Link2, Check, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlayerStore } from "@/lib/stores/player-store";
import { MIN_SHARE_MOMENT_SECONDS, withStartTime } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDuration } from "@/lib/utils";

interface ShareMenuProps {
  url: string;
  title: string;
  /** Message sent with the link, e.g. "Afterglow by Nova Halcyon". Defaults to the title. */
  text?: string;
  /** For songs: while this track is playing, offer sharing from the current moment. */
  trackId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ShareMenu({ url, title, text, trackId, size = "md", className }: ShareMenuProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  // The moment is captured when the menu opens, so it doesn't tick while
  // the listener is choosing.
  const [moment, setMoment] = useState<number | null>(null);
  const iconSize = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }[size];
  const message = text ?? title;

  // A boolean selector: re-renders when the track crosses the threshold or
  // changes, not on every time update.
  const hasMoment = usePlayerStore(
    (s) => !!trackId && s.currentTrack()?.id === trackId && s.currentTime >= MIN_SHARE_MOMENT_SECONDS
  );

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  function currentMoment() {
    const s = usePlayerStore.getState();
    return trackId && s.currentTrack()?.id === trackId && s.currentTime >= MIN_SHARE_MOMENT_SECONDS ? Math.floor(s.currentTime) : null;
  }

  async function nativeShare(shareUrl: string, shareText: string) {
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
    } catch {
      // Cancelled by the user.
    }
  }

  async function copy(shareUrl: string, label = "Link copied") {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: label });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy the link" });
    }
  }

  const triggerClass = cn(
    "flex items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground",
    className
  );

  // One tap straight to the phone's share sheet when there's nothing to choose.
  if (canNativeShare && !hasMoment) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void nativeShare(url, message);
        }}
        aria-label={`Share ${title}`}
        className={triggerClass}
      >
        <Share2 className={iconSize} />
      </button>
    );
  }

  const momentUrl = moment !== null ? withStartTime(url, moment) : null;
  const momentText = moment !== null ? `${message} (from ${formatDuration(moment)})` : message;

  return (
    <DropdownMenu onOpenChange={(open) => open && setMoment(currentMoment())}>
      <DropdownMenuTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} aria-label={`Share ${title}`} className={triggerClass}>
          <Share2 className={iconSize} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" onClick={(e) => e.stopPropagation()}>
        {canNativeShare ? (
          <>
            <DropdownMenuItem onSelect={() => void nativeShare(url, message)}>
              <Share2 className="h-4 w-4" /> Share song
            </DropdownMenuItem>
            {momentUrl && (
              <DropdownMenuItem onSelect={() => void nativeShare(momentUrl, momentText)}>
                <Clock className="h-4 w-4" /> Share from <span className="tabular">{formatDuration(moment!)}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => void copy(url)}>
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} Copy link
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => void copy(url)}>
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} Copy link
            </DropdownMenuItem>
            {momentUrl && (
              <DropdownMenuItem onSelect={() => void copy(momentUrl, `Link copied — starts at ${formatDuration(moment!)}`)}>
                <Clock className="h-4 w-4" /> Copy link from <span className="tabular">{formatDuration(moment!)}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${momentText} ${momentUrl ?? url}`)}`} target="_blank" rel="noopener noreferrer">
                Share on WhatsApp
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(momentText)}&url=${encodeURIComponent(momentUrl ?? url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on X
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(momentUrl ?? url)}`} target="_blank" rel="noopener noreferrer">
                Share on Facebook
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
