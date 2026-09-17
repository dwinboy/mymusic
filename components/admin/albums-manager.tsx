"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Star, StarOff, Eye, EyeOff, Trash2, Disc3, Loader2, ExternalLink, Pencil, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/states/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/lib/admin/cloudinary-upload";

interface AdminAlbum {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  artist: { name: string };
  _count: { tracks: number };
}

interface ArtistOption {
  id: string;
  name: string;
}

export function AlbumsManager({ imageCloudinaryEnabled }: { imageCloudinaryEnabled: boolean }) {
  const [albums, setAlbums] = useState<AdminAlbum[] | null>(null);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAlbum | null>(null);

  function load() {
    fetch("/api/admin/albums")
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums ?? []));
  }

  useEffect(load, []);
  useEffect(() => {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => setArtists(d.artists ?? []));
  }, []);

  async function toggleField(album: AdminAlbum, field: "isPublished" | "isFeatured") {
    setAlbums((prev) => prev?.map((a) => (a.id === album.id ? { ...a, [field]: !a[field] } : a)) ?? null);
    const fd = new FormData();
    fd.set(field, String(!album[field]));
    await fetch(`/api/admin/albums/${album.id}`, { method: "PATCH", body: fd });
  }

  async function deleteAlbum(album: AdminAlbum) {
    if (!confirm(`Delete "${album.title}"? Tracks will become singles.`)) return;
    setAlbums((prev) => prev?.filter((a) => a.id !== album.id) ?? null);
    await fetch(`/api/admin/albums/${album.id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> New album
            </Button>
          </DialogTrigger>
          <DialogContent>
            <AlbumForm
              artists={artists}
              imageCloudinaryEnabled={imageCloudinaryEnabled}
              onSaved={() => {
                setCreateOpen(false);
                load();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {albums === null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      )}

      {albums?.length === 0 && <EmptyState icon={Disc3} title="No albums yet" />}

      {albums && albums.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {albums.map((album) => (
            <div key={album.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-active">
                {album.coverUrl && <Image src={album.coverUrl} alt="" fill sizes="200px" className="object-cover" />}
              </div>
              <p className="mt-2.5 truncate text-sm font-medium text-foreground">{album.title}</p>
              <p className="truncate text-xs text-foreground-muted">
                {album.artist.name} · {album._count.tracks} tracks
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <Badge variant={album.isPublished ? "success" : "default"}>{album.isPublished ? "Published" : "Draft"}</Badge>
                {album.isFeatured && <Badge variant="accent">Featured</Badge>}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <Link href={`/album/${album.slug}`} target="_blank" className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground" title="View">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button onClick={() => setEditing(album)} title="Edit" className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => toggleField(album, "isFeatured")} title="Toggle featured" className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground">
                  {album.isFeatured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => toggleField(album, "isPublished")} title="Toggle published" className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground">
                  {album.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => deleteAlbum(album)} title="Delete" className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-danger">
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
            <AlbumForm
              album={editing}
              artists={artists}
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

function AlbumForm({
  album,
  artists,
  imageCloudinaryEnabled,
  onSaved,
}: {
  album?: AdminAlbum;
  artists: ArtistOption[];
  imageCloudinaryEnabled: boolean;
  onSaved: () => void;
}) {
  const isEdit = !!album;
  const [title, setTitle] = useState(album?.title ?? "");
  const [artistId, setArtistId] = useState("");
  const [description, setDescription] = useState(album?.description ?? "");
  const [releaseDate, setReleaseDate] = useState(album?.releaseDate?.slice(0, 10) ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(album?.coverUrl ?? null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function handleCoverChange(file: File | null) {
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || (!isEdit && !artistId)) return;
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("title", title.trim());
    if (!isEdit) fd.set("artistId", artistId);
    fd.set("description", description.trim());
    if (releaseDate) fd.set("releaseDate", releaseDate);

    try {
      if (coverFile) {
        if (imageCloudinaryEnabled) {
          const uploaded = await uploadImageToCloudinary(coverFile, "vibebanger/covers");
          fd.set("coverImagePublicId", uploaded.publicId);
          fd.set("coverImageUrl", uploaded.secureUrl);
        } else {
          fd.set("cover", coverFile);
        }
      }

      const url = isEdit ? `/api/admin/albums/${album!.id}` : "/api/admin/albums";
      const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", body: fd });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      toast({ title: isEdit ? "Album updated" : "Album created" });
      onSaved();
    } catch {
      setLoading(false);
      setError("Something went wrong uploading the image.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit album" : "New album"}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface text-foreground-subtle transition-colors hover:border-accent"
          >
            {coverPreview ? (
              <Image src={coverPreview} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
          <div className="text-xs text-foreground-subtle">Cover artwork</div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="album-title">Title</Label>
          <Input id="album-title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        {!isEdit && (
          <div>
            <Label>Artist</Label>
            <Select value={artistId} onValueChange={setArtistId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select an artist" />
              </SelectTrigger>
              <SelectContent>
                {artists.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="album-release">Release date</Label>
          <Input id="album-release" type="date" className="mt-1.5" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="album-description">Description</Label>
          <Textarea id="album-description" className="mt-1.5" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading || !title.trim() || (!isEdit && !artistId)}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create album"}
        </Button>
      </div>
    </form>
  );
}
