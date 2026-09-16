"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ShareMenuProps {
  url: string;
  title: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ShareMenu({ url, title, size = "md", className }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const iconSize = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }[size];

  async function handleNativeShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled — no action needed.
      }
    }
  }

  async function copyLink(e: Event | React.MouseEvent) {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore.
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  if (canNativeShare) {
    return (
      <button
        onClick={handleNativeShare}
        aria-label={`Share ${title}`}
        className={cn(
          "flex items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground",
          className
        )}
      >
        <Share2 className={iconSize} />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label={`Share ${title}`}
          className={cn(
            "flex items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground",
            className
          )}
        >
          <Share2 className={iconSize} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={copyLink}>
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {copied ? "Link copied" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on X
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on Facebook
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
