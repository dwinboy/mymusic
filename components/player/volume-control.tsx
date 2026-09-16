"use client";

import { Volume, Volume1, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/lib/stores/player-store";

export function VolumeControl({ className }: { className?: string }) {
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const effectiveVolume = isMuted ? 0 : volume;
  const Icon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.33 ? Volume : effectiveVolume < 0.67 ? Volume1 : Volume2;

  return (
    <div className={className}>
      <div className="flex w-32 items-center gap-2">
        <button
          onClick={toggleMute}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          <Icon className="h-4 w-4" />
        </button>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[effectiveVolume]}
          onValueChange={([v]) => setVolume(v)}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
