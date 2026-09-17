"use client";

import { useSyncExternalStore } from "react";
import { Moon, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { usePlayerStore, type SleepTimerOption } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";

const OPTIONS: { label: string; value: SleepTimerOption }[] = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "End of this song", value: "end-of-track" },
];

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Fits the desktop player bar: "30m", then seconds in the last minute. */
function formatRemainingShort(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds > 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
}

// The current second as external state: read fresh on every render, and
// ticking only while a countdown is showing.
const subscribeToClock = (onTick: () => void) => {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
};
const subscribeToNothing = () => () => {};
const currentSecond = () => Math.floor(Date.now() / 1000) * 1000;

function useNow(active: boolean) {
  return useSyncExternalStore(active ? subscribeToClock : subscribeToNothing, currentSecond, () => 0);
}

export function SleepTimerMenu({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  const { toast } = useToast();
  const sleepTimer = usePlayerStore((s) => s.sleepTimer);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const active = sleepTimer.endsAt !== null || sleepTimer.endOfTrack;
  const now = useNow(sleepTimer.endsAt !== null);
  const remaining = sleepTimer.endsAt !== null ? formatRemaining(sleepTimer.endsAt - now) : null;
  const badge = sleepTimer.endsAt !== null ? (size === "sm" ? formatRemainingShort(sleepTimer.endsAt - now) : remaining) : null;

  function choose(option: SleepTimerOption) {
    setSleepTimer(option);
    toast({
      title: "Sleep timer on",
      description: option === "end-of-track" ? "Music stops when this song ends." : `Music fades out in ${OPTIONS.find((o) => o.value === option)?.label}.`,
    });
  }

  const status = sleepTimer.endOfTrack ? "Stops when this song ends" : remaining ? `Stops in ${remaining}` : "Stop playing after…";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={active ? `Sleep timer: ${status}` : "Sleep timer"}
          className={cn(
            "flex shrink-0 items-center justify-center gap-1 rounded-full transition-colors",
            size === "sm" ? "h-8 min-w-8 px-1.5" : "h-9 min-w-9 px-2",
            active ? "text-accent" : "text-foreground-muted hover:text-foreground",
            className
          )}
        >
          <Moon className={cn("shrink-0", size === "sm" ? "h-4 w-4" : "h-5 w-5")} fill={active ? "currentColor" : "none"} />
          {badge && <span className="text-xs font-medium tabular">{badge}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-foreground-muted">{status}</DropdownMenuLabel>
        {OPTIONS.map((option) => {
          const selected = option.value === "end-of-track" && sleepTimer.endOfTrack;
          return (
            <DropdownMenuItem key={option.label} onSelect={() => choose(option.value)}>
              <span className="flex-1">{option.label}</span>
              {selected && <Check className="h-4 w-4 text-accent" />}
            </DropdownMenuItem>
          );
        })}
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setSleepTimer(null);
                toast({ title: "Sleep timer off" });
              }}
            >
              Turn off timer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
