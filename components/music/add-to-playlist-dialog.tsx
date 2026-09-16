"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ListMusic, Plus, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PlaylistOption {
  id: string;
  title: string;
  containsTrack?: boolean;
}

export function AddToPlaylistDialog({
  trackId,
  trigger,
}: {
  trackId: string;
  trigger: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !session?.user) return;
    setLoading(true);
    fetch(`/api/playlists?trackId=${trackId}`)
      .then((res) => res.json())
      .then((data) => setPlaylists(data.playlists ?? []))
      .finally(() => setLoading(false));
  }, [open, trackId, session?.user]);

  function handleOpenChange(next: boolean) {
    if (next && !session?.user) {
      router.push("/login");
      return;
    }
    setOpen(next);
  }

  async function toggleTrackInPlaylist(playlist: PlaylistOption) {
    setPendingIds((prev) => new Set(prev).add(playlist.id));
    const willContain = !playlist.containsTrack;

    try {
      await fetch(`/api/playlists/${playlist.id}/tracks`, {
        method: willContain ? "POST" : "DELETE",
        headers: willContain ? { "Content-Type": "application/json" } : undefined,
        body: willContain ? JSON.stringify({ trackId }) : undefined,
      });
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlist.id ? { ...p, containsTrack: willContain } : p))
      );
      toast({
        title: willContain ? `Added to ${playlist.title}` : `Removed from ${playlist.title}`,
      });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(playlist.id);
        return next;
      });
    }
  }

  async function createPlaylist() {
    if (newTitle.trim().length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        const newPlaylist = { id: data.playlist.id, title: data.playlist.title, containsTrack: false };
        setPlaylists((prev) => [newPlaylist, ...prev]);
        setNewTitle("");
        await toggleTrackInPlaylist(newPlaylist);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {trigger}
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5" /> Add to playlist
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New playlist name"
            onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
          />
          <Button onClick={createPlaylist} disabled={creating || newTitle.trim().length === 0} size="md">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-foreground-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loading && playlists.length === 0 && (
            <p className="py-8 text-center text-sm text-foreground-muted">
              You don&apos;t have any playlists yet. Create one above.
            </p>
          )}

          {!loading &&
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => toggleTrackInPlaylist(playlist)}
                disabled={pendingIds.has(playlist.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
              >
                {playlist.title}
                {pendingIds.has(playlist.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />
                ) : playlist.containsTrack ? (
                  <Check className="h-4 w-4 text-accent" />
                ) : null}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
