"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/lib/admin/cloudinary-upload";
import { cn } from "@/lib/utils";

export interface EditableProfile {
  id: string;
  name: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
}

type ImageField = "avatar" | "cover";

export function ProfileForm({ profile, imageUploadsEnabled }: { profile: EditableProfile; imageUploadsEnabled: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl);
  const [uploading, setUploading] = useState<ImageField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const dirty = name !== profile.name || bio !== (profile.bio ?? "") || location !== (profile.location ?? "");

  async function patch(body: Record<string, string>) {
    const res = await fetch(`/api/creator/profile/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Couldn't save.");
  }

  // Images save the moment they finish uploading: there's nothing to review,
  // and it avoids an orphaned upload if the page is left before saving.
  async function uploadImage(field: ImageField, file: File) {
    setUploading(field);
    setError(null);
    try {
      const result = await uploadImageToCloudinary(file, "", undefined, "/api/creator/uploads/image");
      await patch(
        field === "avatar"
          ? { avatarImagePublicId: result.publicId, avatarUrl: result.secureUrl }
          : { coverImagePublicId: result.publicId, coverUrl: result.secureUrl }
      );
      if (field === "avatar") setAvatarUrl(result.secureUrl);
      else setCoverUrl(result.secureUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await patch({ name, bio, location });
      toast({ title: "Profile saved" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="overflow-hidden rounded-3xl border border-border bg-surface/40">
      <div className="relative">
        <button
          type="button"
          onClick={() => coverInput.current?.click()}
          disabled={!imageUploadsEnabled || uploading !== null}
          className="group relative block aspect-[3/1] w-full overflow-hidden bg-gradient-to-br from-accent/25 via-surface to-canvas"
          aria-label="Change banner image"
        >
          {coverUrl && <Image src={coverUrl} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 bg-canvas/50 text-sm text-foreground transition-opacity",
              uploading === "cover" ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            )}
          >
            {uploading === "cover" ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {uploading === "cover" ? "Uploading…" : "Change banner"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={!imageUploadsEnabled || uploading !== null}
          className="group absolute -bottom-10 left-5 h-24 w-24 overflow-hidden rounded-full border-4 border-canvas bg-surface sm:left-8 sm:h-28 sm:w-28"
          aria-label="Change profile photo"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl font-semibold text-foreground-muted">
              {name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-canvas/60 transition-opacity",
              uploading === "avatar" ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            )}
          >
            {uploading === "avatar" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </span>
        </button>
        <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage("cover", e.target.files[0])} />
        <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage("avatar", e.target.files[0])} />
      </div>

      <div className="flex flex-col gap-5 px-5 pb-6 pt-14 sm:px-8 sm:pb-8">
        {/* Touch screens have no hover to reveal the image controls. */}
        <div className="flex flex-wrap gap-2 can-hover:hidden">
          <Button type="button" variant="secondary" size="sm" onClick={() => avatarInput.current?.click()} disabled={!imageUploadsEnabled || uploading !== null}>
            <Camera className="h-4 w-4" /> Photo
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => coverInput.current?.click()} disabled={!imageUploadsEnabled || uploading !== null}>
            <ImagePlus className="h-4 w-4" /> Banner
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {/* Same row structure as Location's, so the two inputs line up. */}
            <div className="flex items-baseline justify-between">
              <Label htmlFor={`name-${profile.id}`}>Creator name</Label>
            </div>
            <Input id={`name-${profile.id}`} className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor={`location-${profile.id}`}>Location</Label>
              <span className="text-xs text-foreground-subtle">Optional · shown publicly</span>
            </div>
            <Input id={`location-${profile.id}`} className="mt-1.5" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} />
          </div>
        </div>
        <div>
          <Label htmlFor={`bio-${profile.id}`}>About</Label>
          <Textarea id={`bio-${profile.id}`} className="mt-1.5" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={2000} />
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm text-danger" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        {!imageUploadsEnabled && <p className="text-sm text-foreground-muted">Image uploads aren&apos;t configured on this server.</p>}

        <Button type="submit" className="w-full sm:w-fit" disabled={!dirty || saving || name.trim().length < 2}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function AddProfile() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-fit">
        Add another creator profile
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/creator/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
          setError(data.error ?? "Couldn't create the profile.");
          return;
        }
        setOpen(false);
        setName("");
        router.refresh();
      }}
    >
      <Label htmlFor="new-profile-name">New creator name</Label>
      <p className="-mt-1 text-sm text-foreground-muted">For releasing a different project under its own name.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="new-profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        <Button type="submit" disabled={busy || name.trim().length < 2}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Create
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
