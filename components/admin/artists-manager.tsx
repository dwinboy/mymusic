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
  coverUrl: string | null;
  isFeatured: boolean;
  owner: { id: string; name: string | null; email: string } | null;
  _count: { tracks: number; albums: number };
}

/** An account a profile can be handed to. */
interface AdminAccount {
  id: string;
  name: string | null;
  email: string;
}

export function ArtistsManager({ imageCloudinaryEnabled }: { imageCloudinaryEnabled: boolean }) {
  const [artists, setArtists] = useState<AdminArtist[] | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminArtist | null>(null);
  const { toast } = useToast();

  function load() {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => {
        setArtists(d.artists ?? []);
        setAccounts(d.accounts ?? []);
      });
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
              accounts={accounts}
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
                  {/* Whose profile this is. Said here because an unassigned
                      one is invisible in its owner's upload form, and there
                      was nothing anywhere that showed the difference. */}
                  <p className="truncate text-xs text-foreground-subtle">
                    {artist.owner ? artist.owner.name ?? artist.owner.email : "No account assigned"}
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
                  aria-label={`Edit ${artist.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleFeatured(artist)}
                  title={artist.isFeatured ? "Unfeature" : "Feature"}
                  aria-label={`${artist.isFeatured ? "Unfeature" : "Feature"} ${artist.name}`}
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
              accounts={accounts}
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
  accounts,
  imageCloudinaryEnabled,
  onSaved,
}: {
  artist?: AdminArtist;
  accounts: AdminAccount[];
  imageCloudinaryEnabled: boolean;
  onSaved: () => void;
}) {
  const isEdit = !!artist;
  const [name, setName] = useState(artist?.name ?? "");
  const [bio, setBio] = useState(artist?.bio ?? "");
  const [ownerId, setOwnerId] = useState(artist?.owner?.id ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(artist?.avatarUrl ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(artist?.coverUrl ?? null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  function handleCoverChange(file: File | null) {
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("bio", bio.trim());
    if (isEdit) fd.set("ownerId", ownerId);

    try {
      if (avatarFile) {
        if (imageCloudinaryEnabled) {
          const uploaded = await uploadImageToCloudinary(avatarFile, "vibebanger/avatars");
          fd.set("avatarImagePublicId", uploaded.publicId);
          fd.set("avatarImageUrl", uploaded.secureUrl);
        } else {
          fd.set("avatar", avatarFile);
        }
      }

      if (coverFile) {
        if (imageCloudinaryEnabled) {
          const uploaded = await uploadImageToCloudinary(coverFile, "vibebanger/covers");
          fd.set("coverImagePublicId", uploaded.publicId);
          fd.set("coverImageUrl", uploaded.secureUrl);
        } else {
          fd.set("cover", coverFile);
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

        {/* The banner across the top of the artist's page. Without one the
            page falls back to their artwork, blurred. */}
        <div>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface text-foreground-subtle transition-colors hover:border-accent"
          >
            {coverPreview ? (
              <Image src={coverPreview} alt="" fill sizes="480px" className="object-cover" />
            ) : (
              <span className="flex items-center gap-2 text-xs">
                <ImagePlus className="h-4 w-4" /> Cover image — wide, for the top of their page
              </span>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="artist-name">Name</Label>
          <Input id="artist-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        {/* Only when editing: a profile has to exist before it can be handed
            to anyone, and doing it in two steps keeps the create form short. */}
        {isEdit && (
          <div>
            <Label htmlFor="artist-owner">Who records as this artist</Label>
            <select
              id="artist-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground"
            >
              <option value="">Nobody — managed by admins</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name ? `${account.name} — ${account.email}` : account.email}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-foreground-muted">
              Their upload form only offers profiles they own, so this is what puts this name in it.
            </p>
          </div>
        )}
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
