"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ListMusic, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminPlaylist {
  id: string;
  slug: string;
  title: string;
  isPublic: boolean;
  updatedAt: string;
  user: { name: string | null; email: string };
  _count: { tracks: number };
}

export function PlaylistsManager() {
  const [playlists, setPlaylists] = useState<AdminPlaylist[] | null>(null);

  function load() {
    fetch("/api/admin/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists ?? []));
  }

  useEffect(load, []);

  async function deletePlaylist(playlist: AdminPlaylist) {
    if (!confirm(`Delete "${playlist.title}"?`)) return;
    setPlaylists((prev) => prev?.filter((p) => p.id !== playlist.id) ?? null);
    await fetch(`/api/admin/playlists/${playlist.id}`, { method: "DELETE" });
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

  if (playlists.length === 0) {
    return <EmptyState icon={ListMusic} title="No playlists yet" />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-foreground-subtle">
            <th className="px-4 py-3 font-medium">Playlist</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Tracks</th>
            <th className="px-4 py-3 font-medium">Visibility</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {playlists.map((playlist) => (
            <tr key={playlist.id} className="hover:bg-surface/60">
              <td className="px-4 py-3 font-medium text-foreground">{playlist.title}</td>
              <td className="px-4 py-3 text-foreground-muted">{playlist.user.name ?? playlist.user.email}</td>
              <td className="px-4 py-3 text-foreground-muted">{playlist._count.tracks}</td>
              <td className="px-4 py-3">
                <Badge variant={playlist.isPublic ? "success" : "default"}>
                  {playlist.isPublic ? "Public" : "Private"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/playlist/${playlist.slug}`}
                    target="_blank"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                    title="View"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => deletePlaylist(playlist)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-danger"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
