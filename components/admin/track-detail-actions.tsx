"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayButton } from "@/components/player/play-button";
import { useToast } from "@/hooks/use-toast";
import type { PlayerTrack } from "@/lib/types";

export function TrackDetailActions({ track, songUrl }: { track: PlayerTrack; songUrl: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${track.title}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/tracks/${track.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Track deleted" });
      router.push("/admin/tracks");
      router.refresh();
    } else {
      setDeleting(false);
      toast({ title: "Failed to delete track", variant: "danger" });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <PlayButton track={track} size="sm" variant="ghost" className="border border-border-strong text-foreground" />
      <Button variant="outline" size="sm" asChild>
        <Link href={songUrl} target="_blank">
          <ExternalLink className="h-3.5 w-3.5" /> Preview
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-danger hover:bg-danger/10">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
    </div>
  );
}
