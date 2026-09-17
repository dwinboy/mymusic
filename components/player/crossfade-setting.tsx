"use client";

import { useSyncExternalStore } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { volumeIsControllable } from "@/lib/audio/engine";
import { cn } from "@/lib/utils";

const OPTIONS = [0, 3, 6, 10];

const noop = () => () => {};

export function CrossfadeSetting() {
  const seconds = usePlayerStore((s) => s.crossfadeSeconds);
  const setSeconds = usePlayerStore((s) => s.setCrossfadeSeconds);
  // A browser capability: assumed available while rendering on the server.
  const supported = useSyncExternalStore(noop, volumeIsControllable, () => true);

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Crossfade</p>
          <p className="text-xs text-foreground-muted">
            {supported ? "Blend the end of each song into the next." : "Not available on iPhone and iPad, which don't let apps fade audio."}
          </p>
        </div>
      </div>
      {supported && (
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-surface p-1" role="radiogroup" aria-label="Crossfade length">
          {OPTIONS.map((option) => (
            <button
              key={option}
              role="radio"
              aria-checked={seconds === option}
              onClick={() => setSeconds(option)}
              className={cn(
                "h-8 rounded-md text-xs font-medium transition-colors",
                seconds === option ? "bg-canvas-raised text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
              )}
            >
              {option === 0 ? "Off" : `${option}s`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
