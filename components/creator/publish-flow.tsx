"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Music2,
  ImagePlus,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Clock,
  Download,
  RotateCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { xhrPut } from "@/lib/upload/xhr-put";
import { uploadImageToCloudinary } from "@/lib/admin/cloudinary-upload";
import { cn, formatDuration, formatFileSize } from "@/lib/utils";
import { TermPicker, type TermOption } from "@/components/discovery/term-picker";
import { DuplicateWarning } from "@/components/music/duplicate-warning";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Kind = "GENRE" | "MOOD" | "ACTIVITY" | "OCCASION" | "INSTRUMENT" | "LANGUAGE" | "VOCAL" | "TAG";
type Energy = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
type Disclosure = "AI_GENERATED" | "AI_ASSISTED" | "HUMAN_CREATED";
type LyricsAuthor = "ARTIST" | "AI" | "INSTRUMENTAL";

export interface CreatorProfileOption {
  id: string;
  name: string;
}

export interface PublishTrack {
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
  isExplicit: boolean;
  downloadEnabled: boolean;
  aiDisclosure: Disclosure;
  lyricsAuthor: LyricsAuthor;
  aiTool: string | null;
  aiDetails: string | null;
  energy: Energy | null;
  tempoBpm: number | null;
  rightsConfirmedAt: string | null;
  moderationStatus: "NONE" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  moderationNote: string | null;
  processingStatus: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  processingError: string | null;
  duration: number;
  originalFormat: string | null;
  originalSize: number | null;
  coverImagePublicId: string | null;
  coverImageUrl: string | null;
  coverUrl: string | null;
  terms: { isPrimary: boolean; term: { id: string; kind: Kind } }[];
}

const STEPS = ["Music", "Artwork", "Details", "Discovery", "Rights", "Review"] as const;

const ENERGY: { value: Energy; label: string }[] = [
  { value: "VERY_LOW", label: "Very low" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "VERY_HIGH", label: "Very high" },
];

const DISCLOSURES: { value: Disclosure; title: string; body: string }[] = [
  { value: "AI_GENERATED", title: "AI-generated", body: "The music was created by an AI system, with little or no human performance." },
  { value: "AI_ASSISTED", title: "AI-assisted", body: "A person created the music with meaningful help from AI tools." },
  { value: "HUMAN_CREATED", title: "Human-created", body: "Made by people without generative AI." },
];

/**
 * Who wrote the words — asked separately from how the music was made,
 * because they are separate facts and listeners care about this one. A song
 * composed with AI tools whose lyrics somebody wrote out of their own life is
 * not the same thing as a song where the words were generated too.
 */
const LYRICS_AUTHORS: { value: LyricsAuthor; title: string; body: string }[] = [
  { value: "ARTIST", title: "I wrote them", body: "The words are yours, whatever tools produced the music." },
  { value: "AI", title: "AI wrote them", body: "The words were generated, including if you edited them afterwards." },
  { value: "INSTRUMENTAL", title: "No lyrics", body: "The track has no words." },
];

const ACCEPTED_AUDIO = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/mp4,audio/m4a,audio/x-m4a,audio/aac";

function titleFromFilename(name: string) {
  return name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled track";
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------


function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {hint && <span className="text-xs text-foreground-subtle">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground"
        aria-expanded={open}
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 text-foreground-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="flex flex-col gap-6 border-t border-border px-5 py-5">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------

export function PublishFlow({
  profiles,
  initialTrack,
  imageUploadsEnabled,
  audioR2Enabled,
}: {
  profiles: CreatorProfileOption[];
  initialTrack?: PublishTrack;
  imageUploadsEnabled: boolean;
  audioR2Enabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const editing = !!initialTrack;

  // Edits open on artwork, unless the audio still needs attention.
  const [step, setStep] = useState(initialTrack?.processingStatus === "READY" ? 1 : 0);
  const [furthest, setFurthest] = useState(editing ? STEPS.length - 1 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- server state
  const [track, setTrack] = useState<PublishTrack | null>(initialTrack ?? null);

  // --- music
  const [artistId, setArtistId] = useState(initialTrack?.artistId ?? profiles[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "processing" | "ready" | "failed">(
    initialTrack ? (initialTrack.processingStatus === "READY" ? "ready" : initialTrack.processingStatus === "FAILED" ? "failed" : "processing") : "idle"
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const draftIdRef = useRef<string | null>(initialTrack?.id ?? null);
  // True once "processing" has run long enough that a bare spinner stops
  // being reassuring — whether that's a fresh upload taking a while or a
  // draft reopened after processing never finished last time. Decoupled
  // from whichever fetch is or isn't still in flight: a stalled connection
  // this depends on for its only feedback is exactly the failure mode this
  // exists to catch, so it runs off a plain timer instead.
  // Every read of this is gated on uploadPhase === "processing" already, so
  // a stale `true` from a previous run is never shown — nothing here needs
  // to reset it, only arm a fresh timer each time processing (re)starts.
  const [processingIsSlow, setProcessingIsSlow] = useState(false);
  useEffect(() => {
    if (uploadPhase !== "processing") return;
    const timer = setTimeout(() => setProcessingIsSlow(true), 25_000);
    return () => clearTimeout(timer);
  }, [uploadPhase, track?.id]);

  // --- artwork
  const [coverPublicId, setCoverPublicId] = useState(initialTrack?.coverImagePublicId ?? null);
  const [coverUrl, setCoverUrl] = useState(initialTrack?.coverImageUrl ?? initialTrack?.coverUrl ?? null);
  const [coverSize, setCoverSize] = useState<{ width: number; height: number } | null>(null);
  const [artProgress, setArtProgress] = useState<number | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  // --- details
  const [title, setTitle] = useState(initialTrack?.title ?? "");
  const [albumId, setAlbumId] = useState(initialTrack?.albumId ?? "");
  const [albums, setAlbums] = useState<{ id: string; title: string }[]>([]);
  const [newAlbum, setNewAlbum] = useState("");
  const [description, setDescription] = useState(initialTrack?.description ?? "");
  const [releaseDate, setReleaseDate] = useState(initialTrack?.releaseDate?.slice(0, 10) ?? "");
  const [lyrics, setLyrics] = useState(initialTrack?.lyrics ?? "");
  const [credits, setCredits] = useState(initialTrack?.credits ?? "");
  const [composer, setComposer] = useState(initialTrack?.composer ?? "");
  const [producer, setProducer] = useState(initialTrack?.producer ?? "");

  // --- discovery
  const [taxonomy, setTaxonomy] = useState<Partial<Record<Kind, TermOption[]>>>({});
  const [selected, setSelected] = useState<Record<Kind, string[]>>(() => {
    const base: Record<Kind, string[]> = { GENRE: [], MOOD: [], ACTIVITY: [], OCCASION: [], INSTRUMENT: [], LANGUAGE: [], VOCAL: [], TAG: [] };
    for (const t of initialTrack?.terms ?? []) base[t.term.kind].push(t.term.id);
    return base;
  });
  const [primaryGenre, setPrimaryGenre] = useState<string | null>(
    initialTrack?.terms.find((t) => t.isPrimary && t.term.kind === "GENRE")?.term.id ?? null
  );
  const [energy, setEnergy] = useState<Energy | null>(initialTrack?.energy ?? null);
  const [tempo, setTempo] = useState(initialTrack?.tempoBpm ? String(initialTrack.tempoBpm) : "");
  const [suggestions, setSuggestions] = useState<{ key: string; byKind: Partial<Record<Kind, { id: string; name: string }[]>> }>({
    key: "",
    byKind: {},
  });
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false);

  // --- rights & disclosure
  const [disclosure, setDisclosure] = useState<Disclosure>(initialTrack?.aiDisclosure ?? "AI_ASSISTED");
  const [lyricsAuthor, setLyricsAuthor] = useState<LyricsAuthor>(initialTrack?.lyricsAuthor ?? "ARTIST");
  const [aiTool, setAiTool] = useState(initialTrack?.aiTool ?? "");
  const [aiDetails, setAiDetails] = useState(initialTrack?.aiDetails ?? "");
  const [rightsAccepted, setRightsAccepted] = useState(!!initialTrack?.rightsConfirmedAt);
  const [explicit, setExplicit] = useState(initialTrack?.isExplicit ?? false);

  // --- review
  const [problems, setProblems] = useState<{ field: string; message: string }[]>([]);
  // null until submitted; then whether it went live and where to hear it.
  const [submitted, setSubmitted] = useState<{ live: boolean; slug: string } | null>(null);

  useEffect(() => {
    fetch("/api/taxonomy")
      .then((r) => r.json())
      .then((d) => setTaxonomy(d.terms ?? {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!artistId) return;
    fetch(`/api/creator/albums?artistId=${artistId}`)
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums ?? []))
      .catch(() => {});
  }, [artistId]);

  // Suggest classification from what the catalogue pairs with the chosen genres.
  const genreKey = selected.GENRE.join(",");
  useEffect(() => {
    if (!genreKey) return;
    const controller = new AbortController();
    fetch(`/api/taxonomy/suggestions?genre=${genreKey}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setSuggestions({ key: genreKey, byKind: d.suggestions ?? {} }))
      .catch(() => {});
    return () => controller.abort();
  }, [genreKey]);

  const pendingSuggestions = useMemo(() => {
    const out: { kind: Kind; id: string; name: string }[] = [];
    // Suggestions for a previous genre selection are stale; show nothing
    // until the current one's arrive.
    if (suggestions.key !== genreKey) return out;
    for (const [kind, list] of Object.entries(suggestions.byKind) as [Kind, { id: string; name: string }[]][]) {
      for (const s of list) if (!selected[kind].includes(s.id)) out.push({ kind, ...s });
    }
    return out;
  }, [suggestions, selected, genreKey]);

  const toggle = (kind: Kind, id: string) => {
    setError(null);
    if (kind === "GENRE") {
      const has = selected.GENRE.includes(id);
      if (has && primaryGenre === id) setPrimaryGenre(selected.GENRE.find((g) => g !== id) ?? null);
      if (!has && !primaryGenre) setPrimaryGenre(id);
    }
    // Functional update: "Accept all" toggles several terms in one event.
    setSelected((prev) => ({
      ...prev,
      [kind]: prev[kind].includes(id) ? prev[kind].filter((x) => x !== id) : [...prev[kind], id],
    }));
  };

  // Keep the current step visible in the horizontally scrolling stepper.
  const stepper = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = stepper.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !active) return;
    list.scrollTo({ left: active.offsetLeft - (list.clientWidth - active.clientWidth) / 2, behavior: "smooth" });
  }, [step]);

  // ---------------------------------------------------------------------------
  // Music
  // ---------------------------------------------------------------------------

  async function startUpload(picked: File) {
    if (!artistId) {
      setError("Choose a creator profile first.");
      return;
    }
    setError(null);
    setFile(picked);
    const draftTitle = title.trim() || titleFromFilename(picked.name);
    setTitle(draftTitle);
    setUploadPhase("uploading");
    setUploadProgress(0);

    const form = new FormData();
    form.set("artistId", artistId);
    form.set("title", draftTitle);
    form.set("filename", picked.name);
    form.set("contentType", picked.type);
    // Direct-to-storage uploads must not send the bytes through our server;
    // only local development storage needs the file on this request.
    if (!audioR2Enabled) form.set("audio", picked);

    let draftId: string | null = null;
    let stored = false;
    try {
      const res = await fetch("/api/creator/tracks/draft", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start the upload.");
      draftId = data.track.id as string;
      draftIdRef.current = draftId;

      if (data.upload.mode === "r2") {
        await xhrPut(data.upload.uploadUrl, picked, setUploadProgress);
        stored = true;
        setUploadPhase("processing");
        const processRes = await fetch(`/api/creator/tracks/${draftId}/process`, { method: "POST" });
        await reload(draftId);
        // A failed run keeps the draft (marked FAILED) so the creator can
        // retry processing without uploading again.
        setUploadPhase(processRes.ok ? "ready" : "failed");
        return;
      }
      stored = true;
      await reload(draftId);
      setUploadPhase("ready");
    } catch (e) {
      // A draft whose file never reached storage can't be recovered; remove
      // it rather than leave a permanently stuck upload behind.
      if (draftId && !stored) fetch(`/api/creator/tracks/${draftId}`, { method: "DELETE" }).catch(() => {});
      setUploadPhase("idle");
      setFile(null);
      setError(e instanceof Error ? e.message : "Upload failed. Check your connection and try again.");
    }
  }

  async function reload(id: string) {
    const res = await fetch(`/api/creator/tracks/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTrack(data.track);
      return data.track as PublishTrack;
    }
    return null;
  }

  async function retryProcessing() {
    // track is only set once a previous attempt finished and called
    // reload() — a first attempt that hung never gets that far, so this
    // has to work off the id from the moment the draft was created, not
    // wait for track to exist.
    const id = track?.id ?? draftIdRef.current;
    if (!id) return;
    setUploadPhase("processing");
    const res = await fetch(`/api/creator/tracks/${id}/process`, { method: "POST" });
    await reload(id);
    setUploadPhase(res.ok ? "ready" : "failed");
  }

  // ---------------------------------------------------------------------------
  // Artwork
  // ---------------------------------------------------------------------------

  async function uploadCover(picked: File) {
    setError(null);
    setArtProgress(0);
    try {
      const result = await uploadImageToCloudinary(picked, "", setArtProgress, "/api/creator/uploads/image");
      setCoverPublicId(result.publicId);
      setCoverUrl(result.secureUrl);
      setCoverSize({ width: result.width, height: result.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Artwork upload failed.");
    } finally {
      setArtProgress(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Saving
  // ---------------------------------------------------------------------------

  async function save(fields: FormData): Promise<boolean> {
    if (!track) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/creator/tracks/${track.id}`, { method: "PATCH", body: fields });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save. Try again.");
        return false;
      }
      setTrack(data.track);
      if (data.returnedToReview) {
        toast({
          title: "Back in review",
          description: "Changing the title, artwork or AI disclosure of an approved track needs another look before it's live again.",
        });
      }
      return true;
    } catch {
      setError("Couldn't reach the server. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function stepFields(index: number): FormData | null {
    const f = new FormData();
    switch (STEPS[index]) {
      case "Artwork":
        if (!coverPublicId || coverPublicId === track?.coverImagePublicId) return null;
        f.set("coverImagePublicId", coverPublicId);
        f.set("coverImageUrl", coverUrl ?? "");
        if (coverSize) {
          f.set("coverImageWidth", String(coverSize.width));
          f.set("coverImageHeight", String(coverSize.height));
        }
        return f;
      case "Details":
        f.set("title", title);
        f.set("albumId", albumId);
        f.set("description", description);
        f.set("releaseDate", releaseDate);
        f.set("lyrics", lyrics);
        f.set("credits", credits);
        f.set("composer", composer);
        f.set("producer", producer);
        return f;
      case "Discovery":
        for (const kind of Object.keys(selected) as Kind[]) {
          // The empty entry makes the key present even with nothing chosen,
          // so deselecting everything clears the kind server-side.
          f.append(`terms:${kind}`, "");
          for (const id of selected[kind]) f.append(`terms:${kind}`, id);
        }
        if (primaryGenre) f.set("primaryGenreId", primaryGenre);
        f.set("energy", energy ?? "");
        f.set("tempoBpm", tempo);
        return f;
      case "Rights":
        f.set("aiDisclosure", disclosure);
        f.set("lyricsAuthor", lyricsAuthor);
        f.set("aiTool", aiTool);
        f.set("aiDetails", aiDetails);
        // Not a choice in this flow any more: offline listening is part of
        // what the app does, not something to switch off per track.
        f.set("downloadEnabled", "true");
        f.set("isExplicit", String(explicit));
        if (rightsAccepted) f.set("rightsConfirmed", "true");
        return f;
      default:
        return null;
    }
  }

  function canLeave(index: number): string | null {
    switch (STEPS[index]) {
      case "Music":
        if (uploadPhase !== "ready") return "Upload your audio and wait for it to finish processing.";
        return null;
      case "Artwork":
        return coverUrl ? null : "Add cover artwork.";
      case "Details":
        return title.trim() ? null : "Add a title.";
      case "Discovery":
        return selected.GENRE.length ? null : "Choose at least one genre.";
      case "Rights":
        return rightsAccepted ? null : "Confirm your rights to continue.";
      default:
        return null;
    }
  }

  async function goTo(target: number) {
    if (target > step) {
      const blocker = canLeave(step);
      if (blocker) {
        setError(blocker);
        return;
      }
      const fields = stepFields(step);
      if (fields && !(await save(fields))) return;
    }
    setError(null);
    setStep(target);
    setFurthest((f) => Math.max(f, target));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!track) return;
    setSaving(true);
    setError(null);
    setProblems([]);
    try {
      const res = await fetch(`/api/creator/tracks/${track.id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setProblems(data.problems ?? []);
        setError(data.error ?? "Couldn't submit.");
        return;
      }
      setSubmitted({ live: !!data.published, slug: data.track?.slug ?? "" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function createAlbum() {
    const name = newAlbum.trim();
    if (!name) return;
    const res = await fetch("/api/creator/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId, title: name }),
    });
    const data = await res.json();
    if (res.ok) {
      setAlbums((prev) => [data.album, ...prev]);
      setAlbumId(data.album.id);
      setNewAlbum("");
    } else {
      setError(data.error ?? "Couldn't create the album.");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (submitted) {
    const { live, slug } = submitted;
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
          {live ? <Check className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          {live ? "It's live" : "Submitted for review"}
        </h2>
        <p className="mt-3 text-foreground-muted">
          {live ? (
            <>
              <span className="text-foreground">{title}</span> is on Vibe Banger now — anyone can play it, and it will
              show up wherever it was classified.
            </>
          ) : (
            <>
              <span className="text-foreground">{title}</span> will go live as soon as it&apos;s approved. You can follow
              its status in your music, and you&apos;ll see a note here if anything needs changing.
            </>
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={live && slug ? `/song/${slug}` : "/creator/music"}>{live ? "Listen to it" : "View my music"}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/creator/upload">Upload another</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = track?.moderationStatus;
  const disclosureOption = DISCLOSURES.find((d) => d.value === disclosure)!;
  const termNames = (kind: Kind) => selected[kind].map((id) => taxonomy[kind]?.find((t) => t.id === id)?.name).filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      {editing && status === "REJECTED" && track?.moderationNote && (
        <div className="flex gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-medium text-foreground">Changes requested</p>
            <p className="mt-1 text-sm text-foreground-muted">{track.moderationNote}</p>
          </div>
        </div>
      )}
      {editing && status === "APPROVED" && (
        <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="text-sm text-foreground-muted">
            This track is approved. Changing its title, artwork or AI disclosure sends it back for review; other edits go
            live straight away.
          </p>
        </div>
      )}

      {/* Stepper */}
      <ol ref={stepper} className="scrollbar-hidden relative -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STEPS.map((label, i) => {
          const reachable = i <= furthest;
          const done = i < step || (i <= furthest && i !== step);
          return (
            <li key={label} className="shrink-0">
              <button
                type="button"
                disabled={!reachable || saving}
                aria-current={i === step ? "step" : undefined}
                onClick={() => goTo(i)}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                  i === step
                    ? "border-accent bg-accent/10 text-foreground"
                    : reachable
                      ? "border-border-strong text-foreground-muted hover:text-foreground"
                      : "border-border text-foreground-subtle"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    done && i !== step ? "bg-accent text-accent-foreground" : i === step ? "bg-accent/25 text-accent" : "bg-surface-active"
                  )}
                >
                  {done && i !== step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rounded-3xl border border-border bg-surface/40 p-5 sm:p-8">
        {/* ------------------------------------------------------------ MUSIC */}
        {STEPS[step] === "Music" && (
          <div className="flex flex-col gap-6">
            <header>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Your music</h2>
              <p className="mt-1 text-sm text-foreground-muted">MP3, WAV, FLAC or M4A, up to 200MB. It uploads straight to storage.</p>
            </header>

            {profiles.length > 1 && (
              <Field label="Release as">
                <div className="flex flex-wrap gap-2">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={uploadPhase !== "idle"}
                      onClick={() => setArtistId(p.id)}
                      className={cn(
                        "h-10 rounded-full border px-4 text-sm transition-colors",
                        artistId === p.id ? "border-accent bg-accent/10 text-foreground" : "border-border-strong text-foreground-muted"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {uploadPhase === "idle" ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) startUpload(dropped);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                  dragging ? "border-accent bg-accent/5" : "border-border-strong hover:border-accent/60"
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-accent">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Drop your track here</p>
                  <p className="mt-0.5 text-sm text-foreground-muted">or tap to choose a file</p>
                </div>
                <input type="file" accept={ACCEPTED_AUDIO} className="hidden" onChange={(e) => e.target.files?.[0] && startUpload(e.target.files[0])} />
              </label>
            ) : (
              <div className="rounded-2xl border border-border bg-canvas/40 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-accent">
                    {uploadPhase === "ready" ? <Check className="h-5 w-5" /> : uploadPhase === "failed" ? <AlertTriangle className="h-5 w-5 text-danger" /> : <Music2 className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{file?.name ?? track?.title}</p>
                    <p className="text-sm text-foreground-muted">
                      {uploadPhase === "uploading" && `Uploading · ${uploadProgress}%`}
                      {uploadPhase === "processing" &&
                        (processingIsSlow
                          ? "Still working — longer tracks can take a couple of minutes"
                          : "Processing — creating streaming and download versions")}
                      {uploadPhase === "failed" && (track?.processingError ?? "Processing failed")}
                      {uploadPhase === "ready" && "Ready"}
                    </p>
                  </div>
                  {uploadPhase === "processing" && !processingIsSlow && (
                    <Loader2 className="h-5 w-5 animate-spin text-foreground-subtle" />
                  )}
                  {uploadPhase === "failed" && (
                    <Button size="sm" variant="secondary" onClick={retryProcessing}>
                      <RotateCw className="h-4 w-4" /> Retry
                    </Button>
                  )}
                </div>
                {uploadPhase === "uploading" && <Progress value={uploadProgress} className="mt-4" />}
                {uploadPhase === "processing" && processingIsSlow && (
                  // Not a dead end: retrying is always safe (it re-encodes from
                  // the original, already-uploaded file, whatever became of
                  // the attempt in flight), and this is the only way out for
                  // someone who reopened a draft that got stuck last time —
                  // nothing here was ever retried automatically before.
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                    <p className="text-xs text-foreground-subtle">
                      Still going after a while usually means the connection dropped, not that anything broke — the
                      file you uploaded is safe either way.
                    </p>
                    <Button size="sm" variant="secondary" className="shrink-0" onClick={retryProcessing}>
                      <RotateCw className="h-4 w-4" /> Try again
                    </Button>
                  </div>
                )}
                {uploadPhase === "ready" && track && (
                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
                    {[
                      ["Duration", formatDuration(track.duration)],
                      ["Format", (track.originalFormat ?? "—").toUpperCase()],
                      ["File size", track.originalSize ? formatFileSize(track.originalSize) : file ? formatFileSize(file.size) : "—"],
                      ["Status", "Processed"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-foreground-subtle">{k}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-foreground tabular">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- ARTWORK */}
        {STEPS[step] === "Artwork" && (
          <div className="flex flex-col gap-6">
            <header>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Cover artwork</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Square images look best — at least 1400×1400. We crop to square automatically, keeping the subject in frame.
              </p>
            </header>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={!imageUploadsEnabled || artProgress !== null}
                className="group relative aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface transition-colors hover:border-accent/60"
              >
                {coverUrl ? (
                  <Image src={coverUrl} alt="Cover preview" fill sizes="320px" className="object-cover" />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-foreground-muted">
                    <ImagePlus className="h-7 w-7" />
                    <span className="text-sm">Upload artwork</span>
                  </span>
                )}
                {artProgress !== null && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-canvas/80">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    <span className="text-sm text-foreground tabular">{artProgress}%</span>
                  </span>
                )}
              </button>
              <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              <div className="flex flex-col gap-3 text-sm text-foreground-muted">
                {!imageUploadsEnabled && <p className="text-danger">Artwork uploads aren&apos;t configured on this server.</p>}
                {coverUrl && (
                  <Button variant="secondary" size="sm" className="w-fit" onClick={() => coverInput.current?.click()} disabled={artProgress !== null}>
                    Replace artwork
                  </Button>
                )}
                <p>Artwork is part of what&apos;s reviewed before your track goes live.</p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- DETAILS */}
        {STEPS[step] === "Details" && (
          <div className="flex flex-col gap-6">
            <header>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Details</h2>
              <p className="mt-1 text-sm text-foreground-muted">Only the title is required.</p>
            </header>
            <Field label="Track title">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                maxLength={120}
                placeholder="Moonlight Dreams"
              />
              <DuplicateWarning artistId={artistId} title={title} excludeTrackId={track?.id} />
            </Field>
            <Field label="Album" hint="Optional">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={albumId}
                  onChange={(e) => setAlbumId(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground"
                >
                  <option value="">Single — no album</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Input value={newAlbum} onChange={(e) => setNewAlbum(e.target.value)} placeholder="New album title" className="sm:w-48" />
                  <Button variant="secondary" onClick={createAlbum} disabled={!newAlbum.trim()} aria-label="Create album">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Field>
            <Field label="Description" hint="Optional">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="What's this track about?" />
            </Field>
            <Field label="Release date" hint="Optional">
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="sm:w-56" />
            </Field>
            <Collapsible title="Lyrics & credits">
              <Field label="Lyrics" hint="Optional">
                <Textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={6} />
                {/* This used to read "paste LRC — lines like [00:12.30]Words",
                    which is a format, not an instruction anyone was going to
                    follow: not one track ever arrived with timings. The tool
                    does it by tapping along instead. */}
                {initialTrack?.id && (
                  <p className="mt-2 text-xs text-foreground-subtle">
                    {lyrics.trim() ? (
                      <>
                        <Link
                          href={`/creator/tracks/${initialTrack.id}/lyrics`}
                          className="font-medium text-accent underline underline-offset-2"
                        >
                          Tap them into time
                        </Link>{" "}
                        and they&apos;ll follow the song for listeners, who can tap any line to jump to it.
                      </>
                    ) : (
                      <>Write the lyrics here, save, and you can then tap them into time with the song.</>
                    )}
                  </p>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Composer">
                  <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
                </Field>
                <Field label="Producer">
                  <Input value={producer} onChange={(e) => setProducer(e.target.value)} />
                </Field>
              </div>
              <Field label="Credits">
                <Textarea value={credits} onChange={(e) => setCredits(e.target.value)} rows={3} />
              </Field>
            </Collapsible>
          </div>
        )}

        {/* -------------------------------------------------------- DISCOVERY */}
        {STEPS[step] === "Discovery" && (
          <div className="flex flex-col gap-8">
            <header>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Help listeners find it</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Genre is required. The rest decides which moods, activities and occasions your track appears under.
              </p>
            </header>

            <TermPicker
              label="Genre"
              hint="Required · choose one or more"
              options={taxonomy.GENRE ?? []}
              selected={selected.GENRE}
              onToggle={(id) => toggle("GENRE", id)}
              primaryId={primaryGenre}
              onPrimary={setPrimaryGenre}
            />

            {pendingSuggestions.length > 0 && !dismissedSuggestions && (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Suggested for this genre</p>
                    <p className="mt-0.5 text-xs text-foreground-muted">Based on how similar music on the platform is classified. Nothing is applied unless you choose it.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pendingSuggestions.map((s) => (
                        <button
                          key={`${s.kind}-${s.id}`}
                          type="button"
                          onClick={() => toggle(s.kind, s.id)}
                          className="inline-flex h-8 items-center gap-1 rounded-full border border-border-strong px-3 text-xs text-foreground-muted transition-colors hover:border-accent hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" /> {s.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          for (const s of pendingSuggestions) toggle(s.kind, s.id);
                        }}
                      >
                        Accept all
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDismissedSuggestions(true)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <TermPicker label="Mood" hint="Recommended" options={taxonomy.MOOD ?? []} selected={selected.MOOD} onToggle={(id) => toggle("MOOD", id)} />
            <TermPicker label="Perfect for — activities" hint="Recommended" options={taxonomy.ACTIVITY ?? []} selected={selected.ACTIVITY} onToggle={(id) => toggle("ACTIVITY", id)} />
            <TermPicker label="Perfect for — occasions" hint="Recommended" options={taxonomy.OCCASION ?? []} selected={selected.OCCASION} onToggle={(id) => toggle("OCCASION", id)} />
            <TermPicker label="Vocals" hint="Recommended" options={taxonomy.VOCAL ?? []} selected={selected.VOCAL} onToggle={(id) => toggle("VOCAL", id)} />
            <TermPicker label="Language" hint="If it has lyrics" options={taxonomy.LANGUAGE ?? []} selected={selected.LANGUAGE} onToggle={(id) => toggle("LANGUAGE", id)} />

            <Field label="Energy" hint="Recommended">
              <div className="flex flex-wrap gap-2">
                {ENERGY.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEnergy(energy === e.value ? null : e.value)}
                    aria-pressed={energy === e.value}
                    className={cn(
                      "h-9 rounded-full border px-3.5 text-sm transition-colors",
                      energy === e.value ? "border-accent bg-accent/15 text-foreground" : "border-border-strong text-foreground-muted hover:text-foreground"
                    )}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </Field>

            <Collapsible title="Advanced — instruments, tempo, tags">
              <TermPicker label="Instruments" options={taxonomy.INSTRUMENT ?? []} selected={selected.INSTRUMENT} onToggle={(id) => toggle("INSTRUMENT", id)} />
              <Field label="Tempo" hint="BPM">
                <Input type="number" inputMode="numeric" min={20} max={300} value={tempo} onChange={(e) => setTempo(e.target.value)} className="w-32" placeholder="120" />
              </Field>
              <TermPicker label="Tags" options={taxonomy.TAG ?? []} selected={selected.TAG} onToggle={(id) => toggle("TAG", id)} />
            </Collapsible>
          </div>
        )}

        {/* ----------------------------------------------------------- RIGHTS */}
        {STEPS[step] === "Rights" && (
          <div className="flex flex-col gap-8">
            <header>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Rights & AI disclosure</h2>
              <p className="mt-1 text-sm text-foreground-muted">Listeners see how a track was made. You&apos;re responsible for describing it accurately.</p>
            </header>

            <Field label="How was this made?">
              <div className="grid gap-3 sm:grid-cols-3">
                {DISCLOSURES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDisclosure(d.value)}
                    aria-pressed={disclosure === d.value}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      disclosure === d.value ? "border-accent bg-accent/10" : "border-border-strong hover:border-foreground-subtle"
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{d.title}</span>
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", disclosure === d.value ? "border-accent bg-accent" : "border-border-strong")}>
                        {disclosure === d.value && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-xs text-foreground-muted">{d.body}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Who wrote the lyrics?">
              <div className="grid gap-3 sm:grid-cols-3">
                {LYRICS_AUTHORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLyricsAuthor(option.value)}
                    aria-pressed={lyricsAuthor === option.value}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      lyricsAuthor === option.value ? "border-accent bg-accent/10" : "border-border-strong hover:border-foreground-subtle"
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{option.title}</span>
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", lyricsAuthor === option.value ? "border-accent bg-accent" : "border-border-strong")}>
                        {lyricsAuthor === option.value && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-xs text-foreground-muted">{option.body}</span>
                  </button>
                ))}
              </div>
            </Field>

            {disclosure !== "HUMAN_CREATED" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="AI tools used" hint="Optional">
                  <Input value={aiTool} onChange={(e) => setAiTool(e.target.value)} placeholder="e.g. the model or service you used" />
                </Field>
                <Field label="Human contribution" hint="Optional">
                  <Input value={aiDetails} onChange={(e) => setAiDetails(e.target.value)} placeholder="Editing, mixing, lyrics, vocals…" />
                </Field>
              </div>
            )}

            <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
              {/* This was a switch. Turning it off didn't only withhold a
                  file — it removed offline listening and dropped everyone
                  streaming the track to 192k, which nobody toggling
                  "downloads" would expect. Offline is part of what the app
                  is for, so it is no longer something to lose by accident. */}
              <div className="flex items-start gap-3">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Offline listening is on</span>
                  <span className="block text-xs text-foreground-muted">
                    Listeners can save this to their device and play it with no connection.
                  </span>
                </span>
              </div>
              <label className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-foreground">Explicit content</span>
                  <span className="block text-xs text-foreground-muted">Mark tracks with explicit lyrics or themes.</span>
                </span>
                <Switch checked={explicit} onCheckedChange={setExplicit} />
              </label>
            </div>

            <label
              className={cn(
                "flex cursor-pointer gap-4 rounded-2xl border p-5 transition-colors",
                rightsAccepted ? "border-accent bg-accent/5" : "border-border-strong"
              )}
            >
              <input
                type="checkbox"
                checked={rightsAccepted}
                // Once recorded, acceptance can't be withdrawn from here.
                disabled={!!track?.rightsConfirmedAt}
                onChange={(e) => {
                  setRightsAccepted(e.target.checked);
                  setError(null);
                }}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  I confirm that I have the necessary rights or permissions to upload and distribute this music.
                </span>
                <span className="mt-1 block text-xs text-foreground-muted">
                  And that the AI disclosure above is accurate. We keep a record of when you confirmed.
                  {track?.rightsConfirmedAt && ` Confirmed ${new Date(track.rightsConfirmedAt).toLocaleDateString()}.`}
                </span>
              </span>
            </label>
          </div>
        )}

        {/* ----------------------------------------------------------- REVIEW */}
        {STEPS[step] === "Review" && (
          <div className="flex flex-col gap-8">
            <header>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Review</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {status === "APPROVED"
                  ? "Your changes are saved."
                  : status === "PENDING_REVIEW"
                    ? "This track is waiting for review. Any changes you make are what gets reviewed."
                    : "Check everything, then submit. An admin reviews each track before it goes live."}
              </p>
            </header>

            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="relative aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-2xl bg-surface">
                {coverUrl && <Image src={coverUrl} alt="" fill sizes="220px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{disclosureOption.title}</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title || "Untitled"}</h3>
                <p className="text-foreground-muted">
                  {profiles.find((p) => p.id === artistId)?.name}
                  {albumId && ` · ${albums.find((a) => a.id === albumId)?.title ?? "Album"}`}
                </p>
                {track && <p className="mt-1 text-sm text-foreground-subtle tabular">{formatDuration(track.duration)}</p>}
              </div>
            </div>

            <dl className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  ["Genre", termNames("GENRE").join(", ")],
                  ["Mood", termNames("MOOD").join(", ")],
                  ["Activities", termNames("ACTIVITY").join(", ")],
                  ["Occasions", termNames("OCCASION").join(", ")],
                  ["Vocals", termNames("VOCAL").join(", ")],
                  ["Language", termNames("LANGUAGE").join(", ")],
                  ["Energy", ENERGY.find((e) => e.value === energy)?.label ?? ""],
                  ["Lyrics", LYRICS_AUTHORS.find((l) => l.value === lyricsAuthor)?.title ?? ""],                ] as const
              ).map(([k, v]) => (
                <div key={k} className="border-t border-border pt-3">
                  <dt className="text-xs text-foreground-subtle">{k}</dt>
                  <dd className="mt-0.5 text-sm text-foreground">{v || <span className="text-foreground-subtle">—</span>}</dd>
                </div>
              ))}
            </dl>

            {problems.length > 0 && (
              <ul className="flex flex-col gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-5">
                {problems.map((p) => (
                  <li key={p.field} className="flex gap-2 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> {p.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-danger" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0 || saving}>
          Back
        </Button>
        <div className="flex flex-wrap gap-3">
          {step > 0 && step < STEPS.length - 1 && track && (
            <Button
              variant="secondary"
              disabled={saving}
              onClick={async () => {
                const fields = stepFields(step);
                if (!fields || (await save(fields))) toast({ title: "Draft saved" });
              }}
            >
              Save draft
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => goTo(step + 1)} disabled={saving || (step === 0 && uploadPhase !== "ready")}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </Button>
          ) : status === "APPROVED" || status === "PENDING_REVIEW" ? (
            <Button asChild>
              <Link href="/creator/music">Done</Link>
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit for review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
