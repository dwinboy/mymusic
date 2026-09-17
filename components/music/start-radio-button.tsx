"use client";

import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { startRadioFrom } from "@/lib/radio";
import type { PlayerTrack } from "@/lib/types";

export function StartRadioButton({ track }: { track: PlayerTrack }) {
  const { toast } = useToast();
  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label={`Start radio from ${track.title}`}
      title="Start radio"
      onClick={async () => {
        toast({ title: "Radio", description: `Playing songs like ${track.title}` });
        await startRadioFrom(track);
      }}
    >
      <Radio className="h-5 w-5" />
    </Button>
  );
}
