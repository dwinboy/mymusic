"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2, Music2, Mic2, Disc3, X, Compass } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn, formatDuration } from "@/lib/utils";
import type { SearchResponse } from "@/lib/types";

const EMPTY: SearchResponse = { tracks: [], artists: [], albums: [], playlists: [], terms: [] };

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (debouncedQuery.trim().length === 0) {
      setResults(EMPTY);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`)
      .then((res) => res.json())
      .then((data: SearchResponse) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setResults(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    results.tracks.length + results.artists.length + results.albums.length + results.playlists.length + results.terms.length > 0;

  function goToFullSearch() {
    if (query.trim().length === 0) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && goToFullSearch()}
          placeholder="Search songs, artists, albums..."
          className="h-10 w-full rounded-full border border-border-strong bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-foreground-subtle outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {query.length > 0 && (
          <button
            onClick={() => {
              setQuery("");
              setResults(EMPTY);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-canvas-raised p-2 shadow-elevated animate-fade-in">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-foreground-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          )}

          {!isLoading && !hasResults && (
            <div className="px-3 py-6 text-center text-sm text-foreground-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="flex flex-col gap-3 py-1">
              {results.terms.length > 0 && (
                <SearchSection title="Browse" icon={Compass}>
                  <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-0.5">
                    {results.terms.map((term) => (
                      <Link
                        key={term.id}
                        href={term.href}
                        onClick={() => setIsOpen(false)}
                        className="rounded-full border border-border-strong px-3 py-1 text-xs text-foreground transition-colors hover:border-foreground-subtle hover:bg-surface-hover"
                      >
                        {term.name}
                      </Link>
                    ))}
                  </div>
                </SearchSection>
              )}

              {results.tracks.length > 0 && (
                <SearchSection title="Songs" icon={Music2}>
                  {results.tracks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/song/${t.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-hover"
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-active">
                        {t.coverUrl && <Image src={t.coverUrl} alt="" fill sizes="36px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{t.title}</p>
                        <p className="truncate text-xs text-foreground-muted">{t.artistName}</p>
                      </div>
                      <span className="tabular text-xs text-foreground-subtle">{formatDuration(t.duration)}</span>
                    </Link>
                  ))}
                </SearchSection>
              )}

              {results.artists.length > 0 && (
                <SearchSection title="Artists" icon={Mic2}>
                  {results.artists.map((a) => (
                    <Link
                      key={a.id}
                      href={`/artist/${a.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-hover"
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-active">
                        {a.avatarUrl && <Image src={a.avatarUrl} alt="" fill sizes="36px" className="object-cover" />}
                      </div>
                      <p className="truncate text-sm text-foreground">{a.name}</p>
                    </Link>
                  ))}
                </SearchSection>
              )}

              {results.albums.length > 0 && (
                <SearchSection title="Albums" icon={Disc3}>
                  {results.albums.map((al) => (
                    <Link
                      key={al.id}
                      href={`/album/${al.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-hover"
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-active">
                        {al.coverUrl && <Image src={al.coverUrl} alt="" fill sizes="36px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{al.title}</p>
                        <p className="truncate text-xs text-foreground-muted">{al.artistName}</p>
                      </div>
                    </Link>
                  ))}
                </SearchSection>
              )}

              <button
                onClick={goToFullSearch}
                className="mt-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-accent hover:bg-surface-hover"
              >
                See all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
