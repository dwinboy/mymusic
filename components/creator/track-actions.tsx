"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, ExternalLink, EyeOff, Eye, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog, type ConfirmRequest } from "@/components/admin/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import type { StudioTrack } from "@/components/creator/studio-track-row";

export function TrackActions({ track }: { track: StudioTrack }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  async function setVisibility(published: boolean) {
    const res = await fetch(`/api/creator/tracks/${track.id}/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ title: "Couldn't update", description: data.error ?? "Try again." });
      return;
    }
    toast({ title: published ? "Back on Vibe Banger" : "Hidden from listeners", description: track.title });
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${track.title}`} className="shrink-0">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/creator/tracks/${track.id}`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </DropdownMenuItem>
          {track.status === "live" && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/song/${track.slug}`}>
                  <ExternalLink className="h-4 w-4" /> View public page
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/creator/analytics?track=${track.id}`}>
                  <BarChart3 className="h-4 w-4" /> Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  setConfirm({
                    title: `Hide “${track.title}”?`,
                    description: "Listeners won't be able to find or play it. You can put it back any time without another review.",
                    confirmLabel: "Hide track",
                    onConfirm: () => setVisibility(false),
                  })
                }
              >
                <EyeOff className="h-4 w-4" /> Unpublish
              </DropdownMenuItem>
            </>
          )}
          {track.status === "unpublished" && (
            <DropdownMenuItem onSelect={() => setVisibility(true)}>
              <Eye className="h-4 w-4" /> Publish again
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={() =>
              setConfirm({
                title: `Delete “${track.title}”?`,
                description: "This permanently removes the audio, artwork and its listening history. It can't be undone.",
                confirmLabel: "Delete track",
                onConfirm: async () => {
                  const res = await fetch(`/api/creator/tracks/${track.id}`, { method: "DELETE" });
                  if (!res.ok) {
                    toast({ title: "Couldn't delete", description: "Try again." });
                    return;
                  }
                  toast({ title: "Track deleted", description: track.title });
                  router.refresh();
                },
              })
            }
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
