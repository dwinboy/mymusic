import { Share, SquarePlus } from "lucide-react";

/** Safari has no install button to press for the listener, so we show where it lives. */
export function IosInstallSteps() {
  return (
    <ol className="flex flex-col gap-2 text-sm text-foreground-muted">
      <li className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-active text-xs font-semibold text-foreground">1</span>
        <span>
          Tap <Share className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-label="Share" /> Share
          <span className="text-foreground-subtle"> (under ••• on newer iPhones)</span>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-active text-xs font-semibold text-foreground">2</span>
        <span>
          Choose <SquarePlus className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-hidden />{" "}
          <span className="text-foreground">Add to Home Screen</span>
        </span>
      </li>
    </ol>
  );
}
