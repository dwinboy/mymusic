"use client";

import { useRef, useState } from "react";
import { Share2, Link2, Check, Clock, Code2, ImageDown } from "lucide-react";
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
  /**
   * Marks this as a song: adds sharing from the current moment while it
   * plays, a Story image, and the embed code.
   */
  trackId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const EMBED_HEIGHT = 152;

/** lucide no longer ships brand marks; the outline camera is recognisable enough at menu size. */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function ShareMenu({ url, title, text, trackId, size = "md", className }: ShareMenuProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  // Captured when the menu opens, so it doesn't tick while choosing.
  const [moment, setMoment] = useState<number | null>(null);
  // The Story image is fetched as the menu opens: iOS only allows the share
  // sheet during the tap itself, not after waiting on a download.
  const storyFile = useRef<Promise<File | null> | null>(null);
  const storyReady = useRef<File | null>(null);

  const iconSize = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }[size];
  const message = text ?? title;
  const isSong = !!trackId;
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  function currentMoment() {
    const s = usePlayerStore.getState();
    return trackId && s.currentTrack()?.id === trackId && s.currentTime >= MIN_SHARE_MOMENT_SECONDS ? Math.floor(s.currentTime) : null;
  }

  function prepareStory() {
    if (!isSong || storyFile.current) return;
    const slug = new URL(url, window.location.origin).pathname.split("/").pop();
    storyFile.current = fetch(`/song/${slug}/story-image`)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        const file = blob ? new File([blob], `${slug}-vibe-banger-story.jpg`, { type: "image/jpeg" }) : null;
        storyReady.current = file;
        return file;
      })
      .catch(() => null);
  }

  async function nativeShare(shareUrl: string, shareText: string) {
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
    } catch {
      // Cancelled.
    }
  }

  async function copy(value: string, label = "Link copied") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: label });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy" });
    }
  }

  function saveFile(file: File) {
    const href = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function shareToStories() {
    // Instagram's share target ignores links, so the link goes to the
    // clipboard for the Link sticker. Not awaited: the share sheet must open
    // within this tap.
    void navigator.clipboard?.writeText(url).catch(() => {});
    const ready = storyReady.current;
    if (ready && navigator.canShare?.({ files: [ready] })) {
      try {
        await navigator.share({ files: [ready] });
        toast({ title: "Link copied", description: "Add it to your story with the Link sticker." });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        saveFile(ready);
        toast({ title: "Story image saved", description: "Post it from your photos. The link is copied for the Link sticker." });
      }
      return;
    }
    const file = await (storyFile.current ?? Promise.resolve(null));
    if (!file) {
      toast({ title: "Couldn't create the story image" });
      return;
    }
    saveFile(file);
    toast({ title: "Story image saved", description: "Post it to your story. The link is copied for the Link sticker." });
  }

  const triggerClass = cn(
    "flex items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground",
    className
  );

  // Albums, artists and playlists on a phone: straight to the share sheet.
  if (canNativeShare && !isSong) {
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
  const embedCode = isSong
    ? `<iframe src="${url.replace("/song/", "/embed/song/")}" width="100%" height="${EMBED_HEIGHT}" style="border:0;border-radius:12px" allow="autoplay; encrypted-media" loading="lazy" title="${title.replace(/"/g, "&quot;")} on Vibe Banger"></iframe>`
    : "";

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) return;
        setMoment(currentMoment());
        prepareStory();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} aria-label={`Share ${title}`} className={triggerClass}>
          <Share2 className={iconSize} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" onClick={(e) => e.stopPropagation()}>
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
            <DropdownMenuItem onSelect={() => void shareToStories()}>
              <InstagramGlyph className="h-4 w-4" /> Share to Stories
            </DropdownMenuItem>
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
            {isSong && (
              <>
                <DropdownMenuItem onSelect={() => void copy(embedCode, "Embed code copied")}>
                  <Code2 className="h-4 w-4" /> Copy embed code
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void shareToStories()}>
                  <ImageDown className="h-4 w-4" /> Download story image
                </DropdownMenuItem>
              </>
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
