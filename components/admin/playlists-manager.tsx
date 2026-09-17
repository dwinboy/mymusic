"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ListMusic, ExternalLink, Star, StarOff, Eye, EyeOff, Plus, Loader2, ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog, type ConfirmRequest } from "@/components/admin/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/lib/admin/cloudinary-upload";

interface AdminPlaylist {
  id: string;
  slug: string;
  title: string;
  isPublic: boolean;
  isFeatured: boolean;
  kind: "USER" | "EDITORIAL" | "ALGORITHMIC";
  coverUrl: string | null;
  updatedAt: string;
  user: { name: string | null; email: string };
  _count: { tracks: number };
}

const KIND_LABEL: Record<AdminPlaylist["kind"], string> = {
  USER: "Listener",
  EDITORIAL: "Editorial",
  ALGORITHMIC: "Collection",
};

/**
 * Every playlist on the platform, and the controls for the platform's own:
 * create an editorial collection, give it artwork, feature it, publish it.
 * Tracks are added and reordered on the playlist's own page, where the admin
 * who created it is the owner.
 */
export function PlaylistsManager() {
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<AdminPlaylist[] | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const uploadFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/admin/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists ?? []));
  }

  useEffect(load, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 2) return;
    setCreating(true);
    const res = await fetch("/api/admin/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      toast({ title: "Couldn't create it", description: data.error });
      return;
    }
    setTitle("");
    toast({ title: `${data.playlist.title} created`, description: "Add tracks from its page, or from any song's menu." });
    load();
  }

  async function patch(playlist: AdminPlaylist, body: Record<string, unknown>) {
    setBusyId(playlist.id);
    const res = await fetch(`/api/admin/playlists/${playlist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Couldn't save", description: data.error });
      return;
    }
    load();
  }

  async function uploadCover(file: File) {
    const id = uploadFor.current;
    const playlist = playlists?.find((p) => p.id === id);
    if (!playlist) return;
    setBusyId(playlist.id);
    try {
      const result = await uploadImageToCloudinary(file, "vibebanger/playlists");
      await patch(playlist, { coverImagePublicId: result.publicId, coverUrl: result.secureUrl });
      toast({ title: "Artwork updated" });
    } catch {
      toast({ title: "Couldn't upload the artwork" });
    } finally {
      setBusyId(null);
    }
  }

  if (playlists === null) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-3 sm:flex-row sm:items-center">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New editorial playlist — e.g. Deep Sleep" maxLength={120} className="sm:max-w-sm" />
        <Button type="submit" disabled={creating || title.trim().length < 2} className="sm:ml-auto">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
      </form>

      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />

      {playlists.length === 0 ? (
        <EmptyState icon={ListMusic} title="No playlists yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3">
              <button
                type="button"
                onClick={() => {
                  uploadFor.current = playlist.id;
                  fileInput.current?.click();
                }}
                aria-label={`Artwork for ${playlist.title}`}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface text-foreground-subtle hover:border-accent/60"
              >
                {playlist.coverUrl ? <Image src={playlist.coverUrl} alt="" fill sizes="44px" className="object-cover" /> : <ImagePlus className="h-4 w-4" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-foreground">{playlist.title}</p>
                  <Badge variant={playlist.kind === "USER" ? "outline" : "accent"}>{KIND_LABEL[playlist.kind]}</Badge>
                  {playlist.isFeatured && <Badge variant="accent">Featured</Badge>}
                  <Badge variant={playlist.isPublic ? "success" : "default"}>{playlist.isPublic ? "Public" : "Private"}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground-subtle">
                  {playlist._count.tracks} {playlist._count.tracks === 1 ? "track" : "tracks"} · {playlist.user.name ?? playlist.user.email}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => patch(playlist, { isFeatured: !playlist.isFeatured })}
                  disabled={busyId === playlist.id}
                  aria-label={playlist.isFeatured ? `Unfeature ${playlist.title}` : `Feature ${playlist.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                >
                  {playlist.isFeatured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => patch(playlist, { isPublic: !playlist.isPublic })}
                  disabled={busyId === playlist.id}
                  aria-label={playlist.isPublic ? `Hide ${playlist.title}` : `Publish ${playlist.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                >
                  {playlist.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <Link
                  href={`/playlist/${playlist.slug}`}
                  target="_blank"
                  aria-label={`Open ${playlist.title}`}
                  title="Open (add and reorder tracks here)"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() =>
                    setConfirm({
                      title: `Delete “${playlist.title}”?`,
                      description: "The playlist is removed for everyone. The music itself isn't affected.",
                      confirmLabel: "Delete playlist",
                      onConfirm: async () => {
                        await fetch(`/api/admin/playlists/${playlist.id}`, { method: "DELETE" });
                        toast({ title: "Playlist deleted" });
                        load();
                      },
                    })
                  }
                  aria-label={`Delete ${playlist.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
