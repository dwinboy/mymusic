"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BookmarkPlus, BookmarkCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Saves an album to the listener's library. */
export function SaveAlbumButton({ albumId, albumTitle, initialSaved, className }: { albumId: string; albumTitle: string; initialSaved: boolean; className?: string }) {
  const router = useRouter();
  const { status } = useSession();
  const { toast } = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      const res = await fetch(`/api/albums/${albumId}/save`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: next ? "Saved to your library" : "Removed from your library", description: albumTitle });
    } catch {
      setSaved(!next);
      toast({ title: "Couldn't update", description: "Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${albumTitle} from your library` : `Save ${albumTitle} to your library`}
      className={cn("flex items-center justify-center rounded-full transition-colors", saved ? "text-accent" : "text-foreground-muted hover:text-foreground", className)}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <BookmarkCheck className="h-5 w-5" /> : <BookmarkPlus className="h-5 w-5" />}
    </button>
  );
}
