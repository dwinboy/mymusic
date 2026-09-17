"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Pencil, Eye, Star, StarOff, EyeOff, Trash2, Music2, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/empty-state";
import { ConfirmDialog, type ConfirmRequest } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDuration, formatCompactNumber, cn } from "@/lib/utils";

interface AdminTrack {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  duration: number;
  playCount: number;
  downloadCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  processingStatus: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  processingError: string | null;
  artist: { name: string };
  album: { title: string } | null;
}

export function TracksTable() {
  const [tracks, setTracks] = useState<AdminTrack[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "attention">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const debouncedQuery = useDebounce(query, 250);
  const { toast } = useToast();

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (filter === "published") params.set("published", "true");
    if (filter === "draft") params.set("published", "false");

    fetch(`/api/admin/tracks?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setTracks(d.tracks ?? []));
  }, [debouncedQuery, filter]);

  const visibleTracks =
    filter === "attention" ? tracks?.filter((t) => t.processingStatus !== "READY") ?? null : tracks;

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublished(track: AdminTrack) {
    setTracks((prev) => prev?.map((t) => (t.id === track.id ? { ...t, isPublished: !t.isPublished } : t)) ?? null);
    const fd = new FormData();
    fd.set("isPublished", String(!track.isPublished));
    await fetch(`/api/admin/tracks/${track.id}`, { method: "PATCH", body: fd });
  }

  async function toggleFeatured(track: AdminTrack) {
    setTracks((prev) => prev?.map((t) => (t.id === track.id ? { ...t, isFeatured: !t.isFeatured } : t)) ?? null);
    const fd = new FormData();
    fd.set("isFeatured", String(!track.isFeatured));
    await fetch(`/api/admin/tracks/${track.id}`, { method: "PATCH", body: fd });
  }

  async function deleteTrack(track: AdminTrack) {
    setTracks((prev) => prev?.filter((t) => t.id !== track.id) ?? null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(track.id);
      return next;
    });
    const res = await fetch(`/api/admin/tracks/${track.id}`, { method: "DELETE" });
    if (res.ok) toast({ title: "Track deleted" });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkSetPublished(publish: boolean) {
    const ids = [...selected];
    setBulkBusy(true);
    setTracks((prev) => prev?.map((t) => (selected.has(t.id) ? { ...t, isPublished: publish } : t)) ?? null);

    const results = await Promise.all(
      ids.map((id) => {
        const fd = new FormData();
        fd.set("isPublished", String(publish));
        return fetch(`/api/admin/tracks/${id}`, { method: "PATCH", body: fd }).then((r) => r.ok);
      })
    );

    setBulkBusy(false);
    const failed = results.filter((ok) => !ok).length;
    if (failed > 0) {
      // Publishing is refused server-side for tracks whose audio isn't
      // READY, so a partial failure here is expected rather than broken.
      toast({
        title: `${ids.length - failed} updated, ${failed} skipped`,
        description: "Tracks whose audio isn't ready yet can't be published.",
      });
      load();
    } else {
      toast({ title: publish ? `${ids.length} published` : `${ids.length} unpublished` });
    }
    setSelected(new Set());
  }

  async function bulkDelete() {
    const ids = [...selected];
    setBulkBusy(true);
    setTracks((prev) => prev?.filter((t) => !selected.has(t.id)) ?? null);
    await Promise.all(ids.map((id) => fetch(`/api/admin/tracks/${id}`, { method: "DELETE" })));
    setBulkBusy(false);
    setSelected(new Set());
    toast({ title: `${ids.length} track${ids.length === 1 ? "" : "s"} deleted` });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input placeholder="Search tracks..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(["all", "published", "draft", "attention"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f ? "bg-surface text-foreground" : "text-foreground-muted hover:text-foreground",
                f === "attention" && filter !== f && "text-danger/80 hover:text-danger"
              )}
            >
              {f === "attention" ? "Needs attention" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            {selected.size} selected
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => bulkSetPublished(true)}>
              Publish
            </Button>
            <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => bulkSetPublished(false)}>
              Unpublish
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={bulkBusy}
              onClick={() =>
                setConfirmRequest({
                  title: `Delete ${selected.size} track${selected.size === 1 ? "" : "s"}?`,
                  description: "Their audio and artwork are removed too. This can't be undone.",
                  onConfirm: bulkDelete,
                })
              }
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {tracks === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {visibleTracks?.length === 0 && (
        <EmptyState
          icon={Music2}
          title={filter === "attention" ? "Nothing needs attention" : "No tracks found"}
          description={
            filter === "attention"
              ? "Every track has finished processing successfully."
              : "Try a different search or upload a new track."
          }
        />
      )}

      {visibleTracks && visibleTracks.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-foreground-subtle">
                <th className="w-10 px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Select all tracks"
                    className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
                    checked={visibleTracks.length > 0 && visibleTracks.every((t) => selected.has(t.id))}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(visibleTracks.map((t) => t.id)) : new Set())
                    }
                  />
                </th>
                <th className="px-4 py-3 font-medium">Track</th>
                <th className="px-4 py-3 font-medium">Album</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Plays</th>
                <th className="px-4 py-3 font-medium">Downloads</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleTracks.map((track) => (
                <tr
                  key={track.id}
                  className={cn(
                    "transition-colors hover:bg-surface/60",
                    selected.has(track.id) && "bg-accent/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${track.title}`}
                      className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
                      checked={selected.has(track.id)}
                      onChange={() => toggleSelected(track.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-active">
                        {track.coverUrl && <Image src={track.coverUrl} alt="" fill sizes="36px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{track.title}</p>
                        <p className="truncate text-xs text-foreground-muted">{track.artist.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">{track.album?.title ?? "—"}</td>
                  <td className="tabular px-4 py-3 text-foreground-muted">{formatDuration(track.duration)}</td>
                  <td className="px-4 py-3 text-foreground-muted">{formatCompactNumber(track.playCount)}</td>
                  <td className="px-4 py-3 text-foreground-muted">{formatCompactNumber(track.downloadCount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {track.processingStatus === "FAILED" ? (
                        <Badge variant="danger" title={track.processingError ?? "Processing failed"}>
                          <AlertTriangle className="h-3 w-3" /> Failed
                        </Badge>
                      ) : track.processingStatus === "PROCESSING" || track.processingStatus === "UPLOADING" ? (
                        <Badge variant="default">
                          <Loader2 className="h-3 w-3 animate-spin" /> Processing
                        </Badge>
                      ) : (
                        <Badge variant={track.isPublished ? "success" : "default"}>
                          {track.isPublished ? "Published" : "Draft"}
                        </Badge>
                      )}
                      {track.isFeatured && <Badge variant="accent">Featured</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconAction label="Edit" onClick={undefined} href={`/admin/tracks/${track.id}`} icon={Pencil} />
                      <IconAction
                        label={track.isFeatured ? "Unfeature" : "Feature"}
                        onClick={() => toggleFeatured(track)}
                        icon={track.isFeatured ? StarOff : Star}
                      />
                      <IconAction
                        label={track.isPublished ? "Unpublish" : "Publish"}
                        onClick={() => togglePublished(track)}
                        icon={track.isPublished ? EyeOff : Eye}
                      />
                      <IconAction
                        label="Delete"
                        onClick={() =>
                          setConfirmRequest({
                            title: `Delete "${track.title}"?`,
                            description: "Its audio and artwork are removed too. This can't be undone.",
                            onConfirm: () => deleteTrack(track),
                          })
                        }
                        icon={Trash2}
                        destructive
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  );
}

function IconAction({
  label,
  onClick,
  href,
  icon: Icon,
  destructive,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}) {
  const className = cn(
    "flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-hover",
    destructive ? "hover:text-danger" : "hover:text-foreground"
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        <Icon className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <button onClick={onClick} aria-label={label} title={label} className={className}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
