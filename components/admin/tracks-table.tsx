"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Pencil, Eye, Star, StarOff, EyeOff, Trash2, Music2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/empty-state";
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
  artist: { name: string };
  album: { title: string } | null;
}

export function TracksTable() {
  const [tracks, setTracks] = useState<AdminTrack[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
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
    if (!confirm(`Delete "${track.title}"?`)) return;
    setTracks((prev) => prev?.filter((t) => t.id !== track.id) ?? null);
    const res = await fetch(`/api/admin/tracks/${track.id}`, { method: "DELETE" });
    if (res.ok) toast({ title: "Track deleted" });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input placeholder="Search tracks..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-surface text-foreground" : "text-foreground-muted hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {tracks === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {tracks?.length === 0 && (
        <EmptyState icon={Music2} title="No tracks found" description="Try a different search or upload a new track." />
      )}

      {tracks && tracks.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-foreground-subtle">
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
              {tracks.map((track) => (
                <tr key={track.id} className="transition-colors hover:bg-surface/60">
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
                      <Badge variant={track.isPublished ? "success" : "default"}>
                        {track.isPublished ? "Published" : "Draft"}
                      </Badge>
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
                      <IconAction label="Delete" onClick={() => deleteTrack(track)} icon={Trash2} destructive />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
