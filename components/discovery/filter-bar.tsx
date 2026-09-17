"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDimension {
  /** URL param, e.g. "mood". */
  param: string;
  label: string;
  options: FilterOption[];
  /** Radio (one value) rather than multi-select. */
  single?: boolean;
}

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
];

/**
 * The shared filter control for every discovery surface. State lives in the
 * URL, so a filtered view is shareable, survives refresh, and is what the
 * server renders — there's no separate client filter state to drift.
 */
export function FilterBar({ dimensions, className }: { dimensions: FilterDimension[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const valuesFor = (param: string) => searchParams.getAll(param).flatMap((v) => v.split(",")).filter(Boolean);
  const sort = searchParams.get("sort") ?? "recommended";

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("cursor");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function toggle(dim: FilterDimension, value: string) {
    update((params) => {
      const current = valuesFor(dim.param);
      const next = dim.single
        ? current.includes(value)
          ? []
          : [value]
        : current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
      params.delete(dim.param);
      if (next.length) params.set(dim.param, next.join(","));
    });
  }

  const activeCount = dimensions.reduce((n, d) => n + valuesFor(d.param).length, 0);
  const usable = dimensions.filter((d) => d.options.length > 0);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Horizontally scrollable on phones rather than wrapping into a wall of controls. */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-hidden sm:mx-0 sm:flex-wrap sm:px-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border-strong bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover">
              {SORTS.find((s) => s.value === sort)?.label ?? "Recommended"}
              <ChevronDown className="h-4 w-4 text-foreground-subtle" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) =>
                update((params) => (value === "recommended" ? params.delete("sort") : params.set("sort", value)))
              }
            >
              {SORTS.map((s) => (
                <DropdownMenuRadioItem key={s.value} value={s.value}>
                  {s.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span aria-hidden className="h-5 w-px shrink-0 bg-border-strong" />

        {usable.map((dim) => {
          const selected = valuesFor(dim.param);
          const active = selected.length > 0;
          const summary =
            selected.length === 1
              ? dim.options.find((o) => o.value === selected[0])?.label ?? dim.label
              : selected.length > 1
                ? `${dim.label} · ${selected.length}`
                : dim.label;

          return (
            <DropdownMenu key={dim.param}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-accent/60 bg-accent/10 text-foreground"
                      : "border-border-strong text-foreground-muted hover:bg-surface hover:text-foreground"
                  )}
                >
                  {summary}
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                {dim.options.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={selected.includes(option.value)}
                    // Keep the menu open so several values can be picked in one go.
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggle(dim, option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {activeCount > 0 && (
          <button
            onClick={() => update((params) => dimensions.forEach((d) => params.delete(d.param)))}
            className="flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}

        {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground-subtle" aria-label="Updating" />}
      </div>
    </div>
  );
}
