"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { QueuePanel } from "@/components/player/queue-panel";
import { usePlayerStore } from "@/lib/stores/player-store";

export function QueueSheet() {
  const isOpen = usePlayerStore((s) => s.isQueueOpen);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);

  return (
    <Sheet open={isOpen} onOpenChange={setQueueOpen}>
      <SheetContent className="mx-auto max-w-md overflow-y-auto p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Queue</h2>
        <QueuePanel />
      </SheetContent>
    </Sheet>
  );
}
