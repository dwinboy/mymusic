"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Star, StarOff, Trash2, Mic2, Loader2, ExternalLink, Pencil, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/states/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/lib/admin/cloudinary-upload";

interface AdminArtist {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  isFeatured: boolean;
  _count: { tracks: number; albums: number };
}

export function ArtistsManager({ imageCloudinaryEnabled }: { imageCloudinaryEnabled: boolean }) {
  const [artists, setArtists] = useState<AdminArtist[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminArtist | null>(null);
  const { toast } = useToast();

  function load() {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => setArtists(d.artists ?? []));
  }

  useEffect(load, []);

  async function toggleFeatured(artist: AdminArtist) {
    setArtists((prev) => prev?.map((a) => (a.id === artist.id ? { ...a, isFeatured: !a.isFeatured } : a)) ?? null);
    const fd = new FormData();
    fd.set("isFeatured", String(!artist.isFeatured));
    await fetch(`/api/admin/artists/${artist.id}`, { method: "PATCH", body: fd });
  }

  async function deleteArtist(artist: AdminArtist) {
    if (!confirm(`Delete "${artist.name}"?`)) return;
    const res = await fetch(`/api/admin/artists/${artist.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: data.error ?? "Couldn't delete artist", variant: "danger" });
      return;
    }
    setArtists((prev) => prev?.filter((a) => a.id !== artist.id) ?? null);
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> New artist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <ArtistForm
              imageCloudinaryEnabled={imageCloudinaryEnabled}
              onSaved={() => {
                setCreateOpen(false);
                load();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {artists === null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {artists?.length === 0 && <EmptyState icon={Mic2} title="No artists yet" />}

      {artists && artists.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {artists.map((artist) => (
            <div key={artist.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-active">
                  {artist.avatarUrl && <Image src={artist.avatarUrl} alt="" fill sizes="44px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{artist.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {artist._count.tracks} tracks · {artist._count.albums} albums
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1">
                <Link
                  href={`/artist/${artist.slug}`}
                  target="_blank"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                  title="View"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => setEditing(artist)}
                  title="Edit"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleFeatured(artist)}
                  title={artist.isFeatured ? "Unfeature" : "Feature"}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                >
                  {artist.isFeatured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => deleteArtist(artist)}
                  title="Delete"
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing && (
            <ArtistForm
              artist={editing}
              imageCloudinaryEnabled={imageCloudinaryEnabled}
              onSaved={() => {
                setEditing(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArtistForm({
  artist,
  imageCloudinaryEnabled,
  onSaved,
}: {
  artist?: AdminArtist;
  imageCloudinaryEnabled: boolean;
  onSaved: () => void;
}) {
  const isEdit = !!artist;
  const [name, setName] = useState(artist?.name ?? "");
  const [bio, setBio] = useState(artist?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(artist?.avatarUrl ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("bio", bio.trim());

    try {
      if (avatarFile) {
        if (imageCloudinaryEnabled) {
          const uploaded = await uploadImageToCloudinary(avatarFile, "lumen/avatars");
          fd.set("avatarImagePublicId", uploaded.publicId);
          fd.set("avatarImageUrl", uploaded.secureUrl);
        } else {
          fd.set("avatar", avatarFile);
        }
      }

      const url = isEdit ? `/api/admin/artists/${artist!.id}` : "/api/admin/artists";
      const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", body: fd });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      toast({ title: isEdit ? "Artist updated" : "Artist created" });
      onSaved();
    } catch {
      setLoading(false);
      setError("Something went wrong uploading the image.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit artist" : "New artist"}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-border-strong bg-surface text-foreground-subtle transition-colors hover:border-accent"
          >
            {avatarPreview ? (
              <Image src={avatarPreview} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
          <div className="text-xs text-foreground-subtle">
            Avatar
            <br />
            Square image recommended
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="artist-name">Name</Label>
          <Input id="artist-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="artist-bio">Bio</Label>
          <Textarea id="artist-bio" className="mt-1.5" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create artist"}
        </Button>
      </div>
    </form>
  );
}
