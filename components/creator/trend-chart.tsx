import { formatCompactNumber } from "@/lib/utils";

/**
 * Daily plays as bars. Plain elements rather than a charting library: it's
 * one series, and this renders on the server with nothing to hydrate.
 */
export function TrendChart({ points }: { points: { day: string; plays: number; listeners: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.plays));
  const total = points.reduce((sum, p) => sum + p.plays, 0);
  const label = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <figure className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-6">
      <figcaption className="sr-only">
        Daily plays from {label(points[0].day)} to {label(points[points.length - 1].day)}, {total} in total.
      </figcaption>
      <div className="flex items-baseline justify-between text-xs text-foreground-subtle">
        <span>Plays per day</span>
        {total > 0 && <span className="tabular">Peak {formatCompactNumber(max)}</span>}
      </div>
      <div className="relative mt-4 flex h-40 items-end gap-px sm:h-48 sm:gap-0.5" aria-hidden>
        {total === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-foreground-subtle">No plays in this period yet</p>
        )}
        {points.map((point) => (
          <div
            key={point.day}
            title={`${label(point.day)}: ${point.plays} plays, ${point.listeners} listeners`}
            className="group relative flex h-full flex-1 items-end"
          >
            <div
              className="w-full rounded-t-sm bg-accent/70 transition-colors group-hover:bg-accent"
              style={{ height: point.plays > 0 ? `${Math.max(3, (point.plays / max) * 100)}%` : "2px", opacity: point.plays > 0 ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-foreground-subtle tabular">
        <span>{label(points[0].day)}</span>
        <span>{label(points[points.length - 1].day)}</span>
      </div>
    </figure>
  );
}
