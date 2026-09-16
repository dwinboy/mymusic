"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function PlaylistOwnerMenu({ playlistId, currentTitle }: { playlistId: string; currentTitle: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  async function handleRename() {
    setSaving(true);
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setSaving(false);
    if (res.ok) {
      setRenameOpen(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${currentTitle}"? This can't be undone.`)) return;
    const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Playlist deleted" });
      router.push("/library");
      router.refresh();
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-lg" aria-label="Playlist options">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="h-4 w-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename playlist</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename()} />
            <Button onClick={handleRename} disabled={saving || title.trim().length === 0}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
