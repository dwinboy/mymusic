"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Tags, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminGenre {
  id: string;
  name: string;
  _count: { tracks: number };
}

export function GenresManager() {
  const [genres, setGenres] = useState<AdminGenre[] | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    fetch("/api/admin/genres")
      .then((r) => r.json())
      .then((d) => setGenres(d.genres ?? []));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      setName("");
      load();
    }
  }

  async function deleteGenre(genre: AdminGenre) {
    if (!confirm(`Delete "${genre.name}"?`)) return;
    setGenres((prev) => prev?.filter((g) => g.id !== genre.id) ?? null);
    await fetch(`/api/admin/genres/${genre.id}`, { method: "DELETE" });
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-6 flex max-w-sm gap-2">
        <Input placeholder="New genre name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      {genres === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {genres?.length === 0 && <EmptyState icon={Tags} title="No genres yet" />}

      {genres && genres.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {genres.map((genre) => (
            <div key={genre.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{genre.name}</p>
                <p className="text-xs text-foreground-muted">{genre._count.tracks} tracks</p>
              </div>
              <button
                onClick={() => deleteGenre(genre)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-danger"
                aria-label={`Delete ${genre.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
