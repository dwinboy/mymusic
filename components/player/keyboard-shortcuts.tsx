"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { volumeIsControllable } from "@/lib/audio/engine";
import { SHORTCUTS, SEEK_SECONDS, VOLUME_STEP, isTyping } from "@/lib/audio/shortcuts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const SHORTCUTS_EVENT = "vibebanger:shortcuts";

const noop = () => () => {};
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Keyboard control for the player, plus the overlay documenting it.
 *
 * Mounted once beside the player rather than on each control, so a shortcut
 * works wherever you are on the page — the point of them is not having to
 * find the player first.
 */
export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  // Reading it this way keeps the server and first client render agreeing;
  // navigator isn't available until hydration.
  const canSetVolume = useSyncExternalStore(noop, volumeIsControllable, () => true);

  const handler = useCallback((event: KeyboardEvent) => {
    // Browser and OS shortcuts win; so does anything being typed into.
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTyping(event.target)) return;

    const key = event.key.toLowerCase();
    const store = usePlayerStore.getState();

    // Available with or without something playing.
    if (key === "/") {
      const search = document.querySelector<HTMLInputElement>("[data-search-input]");
      if (!search) return;
      event.preventDefault();
      search.focus();
      search.select();
      return;
    }
    if (event.key === "?") {
      event.preventDefault();
      setShowHelp((open) => !open);
      return;
    }
    if (key === "escape") {
      setShowHelp(false);
      return;
    }

    if (!store.currentTrack()) return;

    switch (key) {
      case " ":
      case "k":
        // Space scrolls the page otherwise, which is never what's wanted
        // while music is playing.
        event.preventDefault();
        store.togglePlay();
        break;
      case "arrowright":
        event.preventDefault();
        store.seek(clamp(store.currentTime + SEEK_SECONDS, 0, store.duration || Infinity));
        break;
      case "arrowleft":
        event.preventDefault();
        store.seek(clamp(store.currentTime - SEEK_SECONDS, 0, store.duration || Infinity));
        break;
      case "arrowup":
        if (!volumeIsControllable()) break;
        event.preventDefault();
        store.setVolume(clamp(store.volume + VOLUME_STEP, 0, 1));
        break;
      case "arrowdown":
        if (!volumeIsControllable()) break;
        event.preventDefault();
        store.setVolume(clamp(store.volume - VOLUME_STEP, 0, 1));
        break;
      case "n":
        store.next();
        break;
      case "p":
        store.previous();
        break;
      case "m":
        store.toggleMute();
        break;
      case "s":
        store.toggleShuffle();
        break;
      case "r":
        store.cycleRepeat();
        break;
      case "q":
        store.setQueueOpen(!store.isQueueOpen);
        break;
      case "l":
        // Silently does nothing when the track has no lyrics, which is what
        // the sheet itself decides.
        store.setLyricsOpen(!store.isLyricsOpen);
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);

  // Opened from the player bar too: nothing on screen hints that "?" exists,
  // and a shortcut nobody can find is a shortcut nobody uses.
  useEffect(() => {
    const open = () => setShowHelp(true);
    window.addEventListener(SHORTCUTS_EVENT, open);
    return () => window.removeEventListener(SHORTCUTS_EVENT, open);
  }, []);

  const groups = ["Playback", "Sound", "Elsewhere"] as const;

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Press ? at any time to see this again.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {groups.map((group) => {
            const rows = SHORTCUTS.filter((s) => s.group === group && (canSetVolume || !s.requiresVolume));
            if (rows.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">{group}</h3>
                <dl className="flex flex-col gap-1.5">
                  {rows.map((shortcut) => (
                    <div key={shortcut.label} className="flex items-center gap-3 text-sm">
                      <dt className="w-16 shrink-0">
                        <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border-strong bg-surface px-1.5 font-sans text-xs text-foreground">
                          {shortcut.label}
                        </kbd>
                      </dt>
                      <dd className="text-foreground-muted">{shortcut.description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
