"use client";

import { useEffect, useState } from "react";
import { UploadCloud, Music2, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrackForm, type TrackFormInitial } from "@/components/admin/track-form";
import { QuickCreateArtist } from "@/components/admin/quick-create-artist";
import { xhrPut } from "@/lib/upload/xhr-put";
import { formatFileSize, cn } from "@/lib/utils";

interface Artist {
  id: string;
  name: string;
}

type Phase = "select" | "uploading" | "processing" | "ready";

interface ProcessingStep {
  label: string;
  done: boolean;
}

export function NewTrackFlow({
  imageCloudinaryEnabled,
  audioR2Enabled,
}: {
  imageCloudinaryEnabled: boolean;
  audioR2Enabled: boolean;
}) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("select");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [track, setTrack] = useState<TrackFormInitial | null>(null);

  useEffect(() => {
    fetch("/api/admin/artists")
      .then((r) => r.json())
      .then((d) => setArtists(d.artists ?? []));
  }, []);

  function titleFromFilename(name: string): string {
    return name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled track";
  }

  async function startUpload() {
    if (!file || !artistId) return;
    setError(null);
    setPhase("uploading");
    setProgress(0);

    const draftForm = new FormData();
    draftForm.set("artistId", artistId);
    draftForm.set("title", title.trim() || titleFromFilename(file.name));

    let draftTrackId: string | null = null;

    try {
      // Crucial: in R2 mode we must NOT attach the raw file here — the whole
      // point of direct-to-R2 upload is that these bytes never touch our
      // server. Local mode has no presigned-upload equivalent, so it's the
      // one case where the file rides along with this request instead.
      if (!audioR2Enabled) {
        draftForm.set("audio", file);
      }
      draftForm.set("filename", file.name);
      draftForm.set("contentType", file.type);

      const draftRes = await fetch("/api/admin/tracks/draft", { method: "POST", body: draftForm });
      const draftData = await draftRes.json();

      if (!draftRes.ok) {
        setError(draftData.error ?? "Couldn't start the upload.");
        setPhase("select");
        return;
      }

      draftTrackId = draftData.track.id;

      if (draftData.upload.mode === "r2") {
        // Direct-to-R2 upload with real progress, then trigger processing.
        await xhrPut(draftData.upload.uploadUrl, file, setProgress);
        setPhase("processing");
        setSteps([
          { label: "Original stored", done: true },
          { label: "Extracting metadata", done: false },
          { label: "Creating streaming version", done: false },
          { label: "Creating download version", done: false },
        ]);

        const processRes = await fetch(`/api/admin/tracks/${draftData.track.id}/process`, { method: "POST" });
        const processData = await processRes.json();

        if (!processRes.ok) {
          // Processing failed, but the draft track already exists in the
          // database (now marked FAILED) — hand off to the edit form
          // instead of discarding it, since that form already has a
          // proper retry flow built in. Losing track of a failed draft
          // here would mean the only way back to it is hunting through
          // the tracks list.
          const trackRes = await fetch(`/api/admin/tracks/${draftData.track.id}`);
          const trackData = await trackRes.json();
          if (trackRes.ok && trackData.track) {
            setTrack(toFormInitial(trackData.track));
            setPhase("ready");
            return;
          }
          setError(processData.detail ?? processData.error ?? "Audio processing failed.");
          setPhase("select");
          return;
        }

        setSteps([
          { label: "Original stored", done: true },
          { label: "Metadata extracted", done: true },
          { label: "Streaming version created", done: true },
          { label: "Download version created", done: !!processData.track.downloadStorageKey },
        ]);
        setTrack(toFormInitial(processData.track));
      } else {
        // Local mode: the draft endpoint already stored + transcoded synchronously.
        setPhase("processing");
        setSteps([
          { label: "Original stored", done: true },
          { label: "Metadata extracted", done: true },
          { label: "Streaming version created", done: true },
          { label: "Download version created", done: true },
        ]);
        setTrack(toFormInitial(draftData.track));
      }

      await new Promise((r) => setTimeout(r, 400)); // let the checklist register visually
      setPhase("ready");
    } catch {
      // The draft row already exists server-side in most failure modes
      // here (e.g. the R2 PUT itself failing, which has no retry path in
      // this UI) — clean it up rather than leave a permanently stuck
      // UPLOADING ghost, since the simplest recovery is just uploading
      // again from scratch.
      if (draftTrackId) {
        fetch(`/api/admin/tracks/${draftTrackId}`, { method: "DELETE" }).catch(() => {});
      }
      setError("Upload failed. Check your connection and try again.");
      setPhase("select");
    }
  }

  if (phase === "ready" && track) {
    return <TrackForm initial={track} imageCloudinaryEnabled={imageCloudinaryEnabled} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Label>Artist</Label>
        <div className="mt-1.5 flex items-center gap-2">
          <Select value={artistId} onValueChange={setArtistId} disabled={phase !== "select"}>
            <SelectTrigger className="max-w-sm">
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
          {phase === "select" && (
            <QuickCreateArtist
              onCreated={(artist) => {
                setArtists((prev) => [...prev, artist].sort((a, b) => a.name.localeCompare(b.name)));
                setArtistId(artist.id);
              }}
            />
          )}
        </div>
        {artists.length === 0 && (
          <p className="mt-1.5 text-xs text-foreground-subtle">
            No artists yet — create one without leaving this page.
          </p>
        )}
      </div>

      <div>
        <Label>Audio file</Label>
        <label
          className={cn(
            "mt-1.5 flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-surface px-6 py-10 text-center transition-colors hover:border-accent",
            phase !== "select" && "pointer-events-none opacity-60"
          )}
        >
          <UploadCloud className="h-7 w-7 text-foreground-subtle" />
          {file ? (
            <div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-foreground-muted">{formatFileSize(file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-foreground">Drag and drop, or click to choose a file</p>
              <p className="text-xs text-foreground-muted">MP3, WAV, FLAC, or M4A · up to 200MB</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/mp4,audio/m4a,audio/x-m4a,audio/aac"
            disabled={phase !== "select"}
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              setFile(picked);
              // Seed the title from the filename, but only while the admin
              // hasn't typed their own — re-picking a file shouldn't clobber
              // a title they already corrected.
              if (picked && !title.trim()) setTitle(titleFromFilename(picked.name));
            }}
          />
        </label>
      </div>

      {file && (
        <div>
          <Label htmlFor="new-track-title">Title</Label>
          <Input
            id="new-track-title"
            className="mt-1.5 max-w-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={phase !== "select"}
            placeholder={titleFromFilename(file.name)}
          />
        </div>
      )}

      {phase === "uploading" && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-foreground">
            <Music2 className="h-4 w-4 animate-pulse text-accent" /> Uploading...
          </div>
          <Progress value={progress} />
          <p className="mt-1.5 text-xs text-foreground-muted tabular">{progress}%</p>
        </div>
      )}

      {phase === "processing" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Processing audio</p>
          <div className="flex flex-col gap-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />
                )}
                <span className={step.done ? "text-foreground" : "text-foreground-muted"}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      {phase === "select" && (
        <Button size="lg" onClick={startUpload} disabled={!file || !artistId} className="w-fit">
          Upload track
        </Button>
      )}
    </div>
  );
}


function toFormInitial(track: {
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
  coverUrl: string | null;
  duration: number;
  fileSize: number | null;
  mimeType: string | null;
  processingStatus: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  processingError: string | null;
}): TrackFormInitial {
  return {
    ...track,
    terms: [],
  };
}
