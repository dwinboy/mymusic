"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface Duplicate {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
}

/**
 * Warns when this artist already has a track by this name — the same song
 * uploaded twice is how a catalogue starts to look careless, and nobody
 * notices until two identical cards sit side by side.
 *
 * Deliberately never blocks: a remaster, a radio edit and a live take are all
 * legitimately the same title by the same artist.
 */
export function DuplicateWarning({
  artistId,
  title,
  excludeTrackId,
}: {
  artistId: string;
  title: string;
  excludeTrackId?: string;
}) {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const debouncedTitle = useDebounce(title, 400);

  useEffect(() => {
    const trimmed = debouncedTitle.trim();
    if (!artistId || trimmed.length < 2) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ artistId, title: trimmed });
    if (excludeTrackId) params.set("exclude", excludeTrackId);

    fetch(`/api/tracks/duplicates?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setDuplicates(data.duplicates ?? []);
      })
      .catch(() => {
        // A failed check must never get in the way of publishing.
        if (!cancelled) setDuplicates([]);
      });

    return () => {
      cancelled = true;
    };
  }, [artistId, debouncedTitle, excludeTrackId]);

  if (duplicates.length === 0) return null;
  const [first] = duplicates;

  return (
    <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-xs">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <p className="text-foreground-muted">
        This artist already has{" "}
        <Link href={`/song/${first.slug}`} target="_blank" className="font-medium text-foreground underline">
          {first.title}
        </Link>
        {duplicates.length > 1 && ` and ${duplicates.length - 1} more like it`}
        {first.isPublished ? "" : " (a draft)"}. Carry on if this is a different version.
      </p>
    </div>
  );
}
