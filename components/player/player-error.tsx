"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useToast } from "@/hooks/use-toast";

export function PlayerError() {
  const error = usePlayerStore((s) => s.error);
  const { toast } = useToast();
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== lastError.current) {
      lastError.current = error;
      toast({ title: "Playback issue", description: error, variant: "danger" });
    }
    if (!error) lastError.current = null;
  }, [error, toast]);

  return null;
}
