"use client";

import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TaxonomyKind } from "@/lib/generated/prisma/client";

/** A term as the classification pickers need it — no counts, no artwork. */
export interface TermOption {
  id: string;
  kind: TaxonomyKind;
  name: string;
  slug: string;
  parentId: string | null;
}

/**
 * Picks terms of one kind, shared by the creator publish flow and the admin
 * track form so a track is classified the same way whoever is doing it.
 */
export function TermPicker({
  label,
  hint,
  options,
  selected,
  onToggle,
  primaryId,
  onPrimary,
}: {
  label: string;
  hint?: string;
  options: TermOption[];
  selected: string[];
  onToggle: (id: string) => void;
  primaryId?: string | null;
  onPrimary?: (id: string) => void;
}) {
  if (options.length === 0) return null;
  // Sub-terms (First Dance under Wedding) are indented under their parents
  // rather than listed flat, so the structure reads at a glance.
  const roots = options.filter((o) => !o.parentId || !options.some((p) => p.id === o.parentId));
  const children = (id: string): TermOption[] => options.filter((o) => o.parentId === id);

  const chip = (option: TermOption, nested = false) => {
    const active = selected.includes(option.id);
    const isPrimary = primaryId === option.id;
    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onToggle(option.id)}
        aria-pressed={active}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
          nested && "h-8 text-xs",
          active
            ? "border-accent bg-accent/15 text-foreground"
            : "border-border-strong text-foreground-muted hover:border-foreground-subtle hover:text-foreground"
        )}
      >
        {active && <Check className="h-3.5 w-3.5 text-accent" />}
        {option.name}
        {isPrimary && <span className="ml-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Primary</span>}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {hint && <span className="text-xs text-foreground-subtle">{hint}</span>}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">{roots.map((r) => chip(r))}</div>
        {roots
          .filter((r) => selected.includes(r.id) && children(r.id).length > 0)
          .map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 border-l border-border-strong pl-3">
              <span className="text-xs text-foreground-subtle">{r.name}:</span>
              {children(r.id).map((c) => chip(c, true))}
              {children(r.id)
                .flatMap((c) => (selected.includes(c.id) ? children(c.id) : []))
                .map((g) => chip(g, true))}
            </div>
          ))}
      </div>
      {onPrimary && selected.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          Primary genre:
          {selected.map((id) => {
            const option = options.find((o) => o.id === id);
            if (!option) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPrimary(id)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors",
                  primaryId === id ? "bg-accent text-accent-foreground" : "bg-surface hover:bg-surface-hover"
                )}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
