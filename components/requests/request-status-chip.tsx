import type { SongRequestStatus } from "@/lib/generated/prisma/client";
import { REQUEST_STATUS_LABELS } from "@/lib/song-requests/status";
import { cn } from "@/lib/utils";

/**
 * Where a commission has got to, as a chip.
 *
 * Colour carries meaning rather than decoration: accent for the states that
 * are waiting on the requester, success for delivered, muted for the ones
 * where nothing further will happen.
 */
const TONE: Record<SongRequestStatus, string> = {
  SUBMITTED: "border-border-strong text-foreground-muted",
  QUOTED: "border-accent/40 bg-accent/10 text-accent",
  ACCEPTED: "border-accent/40 bg-accent/10 text-accent",
  IN_PRODUCTION: "border-accent/40 bg-accent/10 text-accent",
  DELIVERED: "border-success/40 bg-success/10 text-success",
  DECLINED: "border-border text-foreground-subtle",
  CANCELLED: "border-border text-foreground-subtle",
};

export function RequestStatusChip({ status, className }: { status: SongRequestStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE[status],
        className
      )}
    >
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}
