"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2, Music2, Mic2, Disc3, X, Compass, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn, formatDuration } from "@/lib/utils";
import type { SearchResponse } from "@/lib/types";

const EMPTY: SearchResponse = { tracks: [], artists: [], albums: [], playlists: [], terms: [] };
const RECENT_KEY = "vibebanger:recent-searches";
const RECENT_LIMIT = 6;

/** Recent searches are a convenience for this browser only — never synced. */
function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function rememberSearch(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return readRecent();
  const next = [trimmed, ...readRecent().filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_LIMIT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private mode or blocked storage — the list just doesn't persist.
  }
  return next;
}

/** One navigable row in the dropdown, in the order they appear on screen. */
interface Option {
  key: string;
  href: string;
}

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  // Keyed by the query it answers, so "still loading" and "stale" are derived
  // rather than tracked in their own state that an effect has to keep in step.
  const [fetched, setFetched] = useState<{ for: string; data: SearchResponse }>({ for: "", data: EMPTY });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  const debouncedQuery = useDebounce(query, 250);
  const trimmed = query.trim();
  const debouncedTrimmed = debouncedQuery.trim();

  const results = trimmed.length > 0 ? fetched.data : EMPTY;
  const isLoading = trimmed.length > 0 && fetched.for !== debouncedTrimmed;

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length === 0) return;

    let cancelled = false;
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      .then((res) => res.json())
      .then((data: SearchResponse) => {
        if (cancelled) return;
        setFetched({ for: q, data });
        setActiveIndex(-1);
      })
      .catch(() => {
        if (!cancelled) setFetched({ for: q, data: EMPTY });
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

  // The flat reading order the arrow keys walk, matching what's rendered.
  const options = useMemo<Option[]>(() => {
    if (!hasResults) return [];
    return [
      ...results.terms.map((t) => ({ key: `term-${t.id}`, href: t.href })),
      ...results.tracks.map((t) => ({ key: `track-${t.id}`, href: `/song/${t.slug}` })),
      ...results.artists.map((a) => ({ key: `artist-${a.id}`, href: `/artist/${a.slug}` })),
      ...results.albums.map((a) => ({ key: `album-${a.id}`, href: `/album/${a.slug}` })),
      { key: "see-all", href: `/search?q=${encodeURIComponent(trimmed)}` },
    ];
  }, [results, hasResults, trimmed]);

  const activeKey = activeIndex >= 0 ? options[activeIndex]?.key : undefined;
  const optionId = (key: string) => `${listId}-${key}`;

  function close() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  /**
   * A link navigates itself; this only finishes the search around it. The box
   * is cleared and released: leaving the term in a focused input means the
   * next keystroke edits a search you already finished — and the "/" shortcut
   * would type a slash into it rather than opening search.
   */
  function selectLink() {
    setRecent(rememberSearch(trimmed));
    setQuery("");
    close();
    inputRef.current?.blur();
  }

  /** Keyboard selection has no link to follow, so it routes itself. */
  function go(href: string) {
    selectLink();
    router.push(href);
  }

  function goToFullSearch() {
    if (trimmed.length === 0) return;
    go(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function runRecent(term: string) {
    setRecent(rememberSearch(term));
    setQuery("");
    close();
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close();
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const active = activeIndex >= 0 ? options[activeIndex] : null;
      if (active) go(active.href);
      else goToFullSearch();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (options.length === 0) return;

    // Moving through results shouldn't also move the text cursor.
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next = (activeIndex + delta + options.length + 1) % (options.length + 1);
    // The extra slot is "nothing selected", so arrowing past the end returns
    // to the query you typed rather than wrapping straight round.
    const index = next === options.length ? -1 : next;
    setActiveIndex(index);
    if (index >= 0) {
      document.getElementById(optionId(options[index].key))?.scrollIntoView({ block: "nearest" });
    }
  }

  const rowClass = (key: string) =>
    cn(
      "flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-hover",
      // Keyboard position has to be obvious at a glance, so it reads stronger
      // than hover rather than the same as it.
      activeKey === key && "bg-surface-hover ring-1 ring-accent"
    );

  const showRecent = isOpen && trimmed.length === 0 && recent.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setRecent(readRecent());
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search songs, artists, albums..."
          // The "/" shortcut focuses whichever search box is on the page.
          data-search-input=""
          role="combobox"
          aria-expanded={isOpen && (hasResults || showRecent)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeKey ? optionId(activeKey) : undefined}
          className="h-10 w-full rounded-full border border-border-strong bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-foreground-subtle outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {query.length > 0 && (
          <button
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showRecent && (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-border bg-canvas-raised p-2 shadow-elevated animate-fade-in">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              <Clock className="h-3 w-3" /> Recent
            </span>
            <button
              onClick={() => {
                try {
                  window.localStorage.removeItem(RECENT_KEY);
                } catch {
                  // Nothing to clear if storage was unavailable anyway.
                }
                setRecent([]);
              }}
              className="text-xs text-foreground-subtle hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-col">
            {recent.map((term) => (
              <button
                key={term}
                onClick={() => runRecent(term)}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-hover"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                <span className="truncate">{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && trimmed.length > 0 && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-canvas-raised p-2 shadow-elevated animate-fade-in"
        >
          {isLoading && !hasResults && (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-foreground-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          )}

          {!isLoading && !hasResults && (
            <div className="px-3 py-6 text-center text-sm text-foreground-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <div className="flex flex-col gap-3 py-1">
              {results.terms.length > 0 && (
                <SearchSection title="Browse" icon={Compass}>
                  <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-0.5">
                    {results.terms.map((term) => (
                      <Link
                        key={term.id}
                        id={optionId(`term-${term.id}`)}
                        role="option"
                        aria-selected={activeKey === `term-${term.id}`}
                        href={term.href}
                        onClick={selectLink}
                        className={cn(
                          "rounded-full border border-border-strong px-3 py-1 text-xs text-foreground transition-colors hover:border-foreground-subtle hover:bg-surface-hover",
                          activeKey === `term-${term.id}` && "border-accent bg-surface-hover ring-1 ring-accent"
                        )}
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
                      id={optionId(`track-${t.id}`)}
                      role="option"
                      aria-selected={activeKey === `track-${t.id}`}
                      href={`/song/${t.slug}`}
                      onClick={selectLink}
                      className={rowClass(`track-${t.id}`)}
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
                      id={optionId(`artist-${a.id}`)}
                      role="option"
                      aria-selected={activeKey === `artist-${a.id}`}
                      href={`/artist/${a.slug}`}
                      onClick={selectLink}
                      className={rowClass(`artist-${a.id}`)}
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
                      id={optionId(`album-${al.id}`)}
                      role="option"
                      aria-selected={activeKey === `album-${al.id}`}
                      href={`/album/${al.slug}`}
                      onClick={selectLink}
                      className={rowClass(`album-${al.id}`)}
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
                id={optionId("see-all")}
                role="option"
                aria-selected={activeKey === "see-all"}
                onClick={goToFullSearch}
                className={cn(
                  "mt-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-accent hover:bg-surface-hover",
                  activeKey === "see-all" && "bg-surface-hover ring-1 ring-accent"
                )}
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
