"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn, formatDuration } from "@/lib/utils";

export function ProgressBar({ className, compact = false }: { className?: string; compact?: boolean }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const [dragValue, setDragValue] = useState<number | null>(null);
  const displayTime = dragValue ?? currentTime;

  useEffect(() => {
    if (dragValue !== null && Math.abs(dragValue - currentTime) < 0.5) {
      setDragValue(null);
    }
  }, [currentTime, dragValue]);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {!compact && (
        <span className="tabular w-10 shrink-0 text-right text-[11px] text-foreground-subtle">
          {formatDuration(displayTime)}
        </span>
      )}
      <Slider
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.1}
        value={[displayTime]}
        onValueChange={([v]) => setDragValue(v)}
        onValueCommit={([v]) => seek(v)}
        className={compact ? "h-1.5" : undefined}
        aria-label="Seek"
      />
      {!compact && (
        <span className="tabular w-10 shrink-0 text-[11px] text-foreground-subtle">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}
