import type { LucideIcon } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";

export function StatCard({ icon: Icon, label, value, format = "number" }: { icon: LucideIcon; label: string; value: number; format?: "number" | "percent" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <Icon className="h-4 w-4 text-accent" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular sm:text-3xl">
        {format === "percent" ? `${Math.round(value * 100)}%` : formatCompactNumber(value)}
      </p>
    </div>
  );
}
