"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { refillRadio } from "@/lib/radio";

/** Songs left in a station's queue before it fetches more. */
const REFILL_BELOW = 3;

/** Keeps a running radio station from ending: refills its queue as it nears the end. */
export function RadioAutofill() {
  const radioSeed = usePlayerStore((s) => s.radio?.seedId ?? null);
  const queued = usePlayerStore((s) => s.tracks.length);
  const remaining = usePlayerStore((s) => s.tracks.length - s.currentIndex - 1);
  const currentId = usePlayerStore((s) => s.currentTrack()?.id ?? null);
  const inflight = useRef(false);
  // A refill that found nothing isn't retried until the song changes.
  const exhaustedAt = useRef<string | null>(null);

  useEffect(() => {
    // A station's first batch is loaded by startRadioFrom itself.
    if (!radioSeed || queued <= 1 || remaining >= REFILL_BELOW) return;
    if (inflight.current || exhaustedAt.current === currentId) return;
    inflight.current = true;
    refillRadio()
      .then((added) => {
        if (added === 0) exhaustedAt.current = currentId;
      })
      .finally(() => {
        inflight.current = false;
      });
  }, [radioSeed, queued, remaining, currentId]);

  return null;
}
