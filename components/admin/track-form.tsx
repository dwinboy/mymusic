"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Music2, Loader2, ImagePlus, AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { xhrUpload } from "@/lib/admin/xhr-upload";
import { uploadImageToCloudinary } from "@/lib/admin/cloudinary-upload";
import { TermPicker, type TermOption } from "@/components/discovery/term-picker";
import { DuplicateWarning } from "@/components/music/duplicate-warning";
import type { TaxonomyKind } from "@/lib/generated/prisma/client";
import { formatDuration, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Artist {
  id: string;
  name: string;
}
interface Album {
  id: string;
  title: string;
}
/** The classification an admin can set, in the order the form presents it. */
const CLASSIFY_KINDS: { kind: TaxonomyKind; label: string; hint?: string }[] = [
  { kind: "GENRE", label: "Genres", hint: "What it sounds like" },
  { kind: "MOOD", label: "Mood", hint: "How it feels" },
  { kind: "ACTIVITY", label: "Perfect for — activities" },
  { kind: "OCCASION", label: "Perfect for — occasions" },
  { kind: "VOCAL", label: "Vocals" },
  { kind: "LANGUAGE", label: "Language", hint: "If it has lyrics" },
  { kind: "INSTRUMENT", label: "Instruments" },
  { kind: "TAG", label: "Tags" },
];

const NO_TERMS: Record<TaxonomyKind, string[]> = {
  GENRE: [], MOOD: [], ACTIVITY: [], OCCASION: [], INSTRUMENT: [], LANGUAGE: [], VOCAL: [], TAG: [],
};

export interface TrackFormInitial {
  id: string;
  title: string;
  artistId: string;
  albumId: string | null;
  description: string | null;
  lyrics: string | null;
  credits: string | null;
  composer: string | null;
  producer: string | null;
  releaseDate: string | null;
  isAiGenerated: boolean;
  isExplicit: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  downloadEnabled: boolean;
  /** Every term already on the track, so each picker opens on its real state. */
  terms: { termId: string; kind: TaxonomyKind; isPrimary: boolean }[];
  coverUrl: string | null;
  duration: number;
  fileSize: number | null;
  mimeType: string | null;
  processingStatus: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  processingError: string | null;
}

export function TrackForm({
  initial,
  imageCloudinaryEnabled = false,
}: {
  initial: TrackFormInitial;
  imageCloudinaryEnabled?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [taxonomy, setTaxonomy] = useState<Partial<Record<TaxonomyKind, TermOption[]>>>({});

  const [title, setTitle] = useState(initial.title);
  const [artistId, setArtistId] = useState(initial.artistId);
  const [albumId, setAlbumId] = useState(initial.albumId ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [lyrics, setLyrics] = useState(initial.lyrics ?? "");
  const [credits, setCredits] = useState(initial.credits ?? "");
  const [composer, setComposer] = useState(initial.composer ?? "");
  const [producer, setProducer] = useState(initial.producer ?? "");
  const [releaseDate, setReleaseDate] = useState(initial.releaseDate?.slice(0, 10) ?? "");
  const [isAiGenerated, setIsAiGenerated] = useState(initial.isAiGenerated);
  const [isExplicit, setIsExplicit] = useState(initial.isExplicit);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [downloadEnabled, setDownloadEnabled] = useState(initial.downloadEnabled);
  const [terms, setTerms] = useState<Record<TaxonomyKind, string[]>>(() => {
    const grouped = { ...NO_TERMS };
    for (const t of initial.terms) grouped[t.kind] = [...grouped[t.kind], t.termId];
    return grouped;
  });
  const [primaryGenreId, setPrimaryGenreId] = useState<string | null>(
    initial.terms.find((t) => t.kind === "GENRE" && t.isPrimary)?.termId ?? null
  );

  const [replaceAudioFile, setReplaceAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initial.coverUrl);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState(initial.processingStatus);
  const [processingError, setProcessingError] = useState(initial.processingError);

  useEffect(() => {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => setArtists(d.artists ?? []));
    // Every kind at once, active terms only — the same vocabulary creators
    // classify with, so both routes into the catalogue agree.
    fetch("/api/taxonomy")
      .then((r) => r.json())
      .then((d) => setTaxonomy(d.terms ?? {}));
  }, []);

  useEffect(() => {
    if (!artistId) {
      setAlbums([]);
      return;
    }
    fetch(`/api/admin/albums?artistId=${artistId}`)
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums ?? []));
  }, [artistId]);

  function handleCoverChange(file: File | null) {
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  function toggleTerm(kind: TaxonomyKind, id: string) {
    setTerms((prev) => {
      const has = prev[kind].includes(id);
      const next = has ? prev[kind].filter((t) => t !== id) : [...prev[kind], id];
      return { ...prev, [kind]: next };
    });
    // Dropping the primary genre leaves the choice to the server, which falls
    // back to the first one selected.
    if (kind === "GENRE" && primaryGenreId === id) setPrimaryGenreId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !artistId) {
      setError("Title and artist are required.");
      return;
    }

    setSubmitting(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("artistId", artistId);
      formData.set("albumId", albumId);
      formData.set("description", description);
      formData.set("lyrics", lyrics);
      formData.set("credits", credits);
      formData.set("composer", composer);
      formData.set("producer", producer);
      if (releaseDate) formData.set("releaseDate", releaseDate);
      formData.set("isAiGenerated", String(isAiGenerated));
      formData.set("isExplicit", String(isExplicit));
      formData.set("isPublished", String(isPublished));
      formData.set("isFeatured", String(isFeatured));
      formData.set("downloadEnabled", String(downloadEnabled));
      // Each kind is sent explicitly, including empty ones: the API replaces
      // only the kinds present, so omitting one would silently keep old tags.
      for (const { kind } of CLASSIFY_KINDS) {
        formData.append(`terms:${kind}`, "");
        terms[kind].forEach((id) => formData.append(`terms:${kind}`, id));
      }
      if (primaryGenreId) formData.set("primaryGenreId", primaryGenreId);
      if (replaceAudioFile) formData.set("audio", replaceAudioFile);

      if (coverFile) {
        if (imageCloudinaryEnabled) {
          setProgressLabel("Uploading artwork...");
          const uploaded = await uploadImageToCloudinary(coverFile, "vibebanger/covers", setProgress);
          formData.set("coverImagePublicId", uploaded.publicId);
          formData.set("coverImageUrl", uploaded.secureUrl);
          formData.set("coverImageWidth", String(uploaded.width));
          formData.set("coverImageHeight", String(uploaded.height));
        } else {
          formData.set("cover", coverFile);
        }
      }

      setProgressLabel(replaceAudioFile ? "Uploading & processing audio..." : "Saving...");
      const { ok, data } = await xhrUpload<{ track?: { id: string; processingStatus: string; processingError: string | null }; error?: string }>(
        `/api/admin/tracks/${initial.id}`,
        "PATCH",
        formData,
        setProgress
      );

      if (!ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      if (data.track) {
        setProcessingStatus(data.track.processingStatus as typeof processingStatus);
        setProcessingError(data.track.processingError);
      }

      toast({ title: "Track saved" });
      router.push(`/admin/tracks/${initial.id}`);
      router.refresh();
    } catch {
      setError("Something failed. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-20">
      {processingStatus !== "READY" && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4",
            processingStatus === "FAILED" ? "border-danger/30 bg-danger/5" : "border-border bg-surface"
          )}
        >
          {processingStatus === "FAILED" ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
          ) : (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-foreground-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {processingStatus === "UPLOADING" && "Waiting for audio upload to finish..."}
              {processingStatus === "PROCESSING" && "Processing audio (creating streaming + download copies)..."}
              {processingStatus === "FAILED" && "Audio processing failed"}
            </p>
            {processingError && <p className="mt-0.5 text-xs text-foreground-muted">{processingError}</p>}
          </div>
          {processingStatus === "FAILED" && (
            <RetryProcessingButton trackId={initial.id} onRetried={(status) => setProcessingStatus(status)} />
          )}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div>
          <Label>Cover artwork</Label>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="relative mt-1.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface text-foreground-subtle transition-colors hover:border-accent"
          >
            {coverPreview ? (
              <Image src={coverPreview} alt="Cover preview" fill sizes="200px" className="object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 p-4 text-center text-xs">
                <ImagePlus className="h-6 w-6" />
                Upload artwork
              </div>
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
          <Label>Audio file <span className="normal-case text-foreground-subtle">(optional — replaces the current audio)</span></Label>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="mt-1.5 flex w-full items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-4 text-left transition-colors hover:border-accent"
          >
            {replaceAudioFile ? (
              <>
                <Music2 className="h-5 w-5 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{replaceAudioFile.name}</p>
                  <p className="text-xs text-foreground-muted">{formatFileSize(replaceAudioFile.size)} · will replace current audio on save</p>
                </div>
              </>
            ) : (
              <>
                <Music2 className="h-5 w-5 shrink-0 text-foreground-subtle" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">Current file · {formatDuration(initial.duration)}</p>
                  <p className="text-xs text-foreground-muted">
                    {initial.fileSize ? formatFileSize(initial.fileSize) : ""} {initial.mimeType}
                  </p>
                </div>
              </>
            )}
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/mp4,audio/m4a,audio/x-m4a,audio/aac"
            className="hidden"
            onChange={(e) => setReplaceAudioFile(e.target.files?.[0] ?? null)}
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title">Track title</Label>
              <Input id="title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <DuplicateWarning artistId={artistId} title={title} excludeTrackId={initial.id} />
            </div>
            <div>
              <Label htmlFor="releaseDate">Release date</Label>
              <Input
                id="releaseDate"
                type="date"
                className="mt-1.5"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Artist</Label>
              <Select value={artistId} onValueChange={(v) => { setArtistId(v); setAlbumId(""); }}>
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
            <div>
              <Label>Album (optional)</Label>
              <Select value={albumId || "none"} onValueChange={(v) => setAlbumId(v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Single / no album" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Single / no album</SelectItem>
                  {albums.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface/40 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Classification</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            How this track is found: a category page lists a track only if it is tagged with that term.
          </p>
        </div>
        {CLASSIFY_KINDS.map(({ kind, label, hint }) => (
          <TermPicker
            key={kind}
            label={label}
            hint={hint}
            options={taxonomy[kind] ?? []}
            selected={terms[kind]}
            onToggle={(id) => toggleTerm(kind, id)}
            {...(kind === "GENRE" ? { primaryId: primaryGenreId, onPrimary: setPrimaryGenreId } : {})}
          />
        ))}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="composer">Composer</Label>
          <Input id="composer" className="mt-1.5" value={composer} onChange={(e) => setComposer(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="producer">Producer</Label>
          <Input id="producer" className="mt-1.5" value={producer} onChange={(e) => setProducer(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="lyrics">Lyrics</Label>
        <p className="mt-1 text-xs text-foreground-subtle">{"Paste LRC — lines like [00:12.30]Words — and the player follows along."}</p>
        <Textarea id="lyrics" className="mt-1.5" value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={5} />
      </div>

      <div>
        <Label htmlFor="credits">Credits</Label>
        <Textarea id="credits" className="mt-1.5" value={credits} onChange={(e) => setCredits(e.target.value)} rows={3} />
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
        <ToggleRow label="AI-generated disclosure" description="Shown publicly as an “AI Composed” badge." checked={isAiGenerated} onChange={setIsAiGenerated} />
        <ToggleRow label="Explicit content" description="Shows an explicit-content indicator." checked={isExplicit} onChange={setIsExplicit} />
        {/* Narrowed to what it actually does now. Offline listening and
            high-quality streaming no longer depend on it, so turning this
            off withholds the saved file and nothing else. */}
        <ToggleRow
          label="Allow saving the file"
          description="Offline listening in the app stays available either way."
          checked={downloadEnabled}
          onChange={setDownloadEnabled}
        />
        <ToggleRow label="Featured" description="Eligible for hero and featured placements." checked={isFeatured} onChange={setIsFeatured} />
        <ToggleRow
          label="Published"
          description={
            processingStatus !== "READY"
              ? "Audio isn't ready yet — this track stays hidden until processing succeeds."
              : "Visible on the public site."
          }
          checked={isPublished}
          onChange={setIsPublished}
          disabled={processingStatus !== "READY"}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {submitting && (
        <div>
          <Progress value={progress} />
          <p className="mt-1.5 text-xs text-foreground-muted">{progressLabel} {progress}%</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </Button>
        {processingStatus === "READY" && <Badge variant="success">Audio ready</Badge>}
      </div>
    </form>
  );
}

function RetryProcessingButton({
  trackId,
  onRetried,
}: {
  trackId: string;
  onRetried: (status: "READY" | "PROCESSING" | "FAILED") => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const { toast } = useToast();

  async function retry() {
    setRetrying(true);
    const res = await fetch(`/api/admin/tracks/${trackId}/process`, { method: "POST" });
    const data = await res.json();
    setRetrying(false);
    if (res.ok) {
      onRetried("READY");
      toast({ title: "Processing succeeded" });
    } else {
      onRetried("FAILED");
      toast({ title: "Processing failed again", description: data.detail ?? data.error, variant: "danger" });
    }
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={retry} disabled={retrying}>
      {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
      Retry
    </Button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
