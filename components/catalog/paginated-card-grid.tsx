"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlbumCard,
  CreatorCard,
  PlaylistCard,
  type AlbumCardData,
  type CreatorCardData,
  type PlaylistCardData,
} from "@/components/music/collection-cards";
import { cn } from "@/lib/utils";

type Props =
  | { type: "albums"; initialItems: AlbumCardData[] }
  | { type: "creators"; initialItems: CreatorCardData[] }
  | { type: "playlists"; initialItems: PlaylistCardData[] };

/**
 * A grid whose first page is server-rendered and which loads the next as the
 * end comes into view (with a button as the fallback), through the same
 * query the page was rendered with.
 */
export function PaginatedCardGrid(props: Props & { initialCursor: string | null; query?: string }) {
  const [items, setItems] = useState<(AlbumCardData | CreatorCardData | PlaylistCardData)[]>(props.initialItems);
  const [cursor, setCursor] = useState(props.initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  async function loadMore() {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams(props.query);
      params.set("cursor", cursor);
      const res = await fetch(`/api/catalog/${props.type}?${params}`);
      if (!res.ok) throw new Error();
      const data: { items: typeof items; nextCursor: string | null } = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i) => !seen.has(i.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || error) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void loadMore(), {
      rootMargin: "600px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, error]);

  return (
    <div>
      <div
        className={cn(
          "grid gap-x-4 gap-y-8",
          props.type === "creators" ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        )}
      >
        {items.map((item) =>
          props.type === "albums" ? (
            <AlbumCard key={item.id} album={item as AlbumCardData} className="w-full sm:w-full" />
          ) : props.type === "creators" ? (
            <CreatorCard key={item.id} creator={item as CreatorCardData} className="w-full sm:w-full" />
          ) : (
            <PlaylistCard key={item.id} playlist={item as PlaylistCardData} className="w-full sm:w-full" />
          )
        )}
      </div>
      {cursor && (
        <div ref={sentinel} className="mt-8 flex flex-col items-center gap-2">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </Button>
          {error && <p className="text-sm text-danger">Couldn&apos;t load more. Try again.</p>}
        </div>
      )}
    </div>
  );
}
