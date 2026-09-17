import { db } from "@/lib/db";
import type { EnergyLevel, TaxonomyKind } from "@/lib/generated/prisma/client";
import type { TrackFilter, TrackSort } from "@/lib/taxonomy";

/**
 * The one place discovery filters are parsed. Pages and /api/tracks both read
 * filters through this, so a URL like `?mood=calm&vocal=instrumental` means
 * exactly the same thing on the Songs page, a genre page, and in search.
 *
 * Filters use kind-named params with slugs — human-readable and shareable —
 * rather than opaque ids.
 */

export const FILTER_PARAMS: Record<string, TaxonomyKind> = {
  genre: "GENRE",
  mood: "MOOD",
  activity: "ACTIVITY",
  occasion: "OCCASION",
  instrument: "INSTRUMENT",
  language: "LANGUAGE",
  vocal: "VOCAL",
  tag: "TAG",
};

export const ENERGY_VALUES: EnergyLevel[] = ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"];
export const SORT_VALUES: TrackSort[] = ["recommended", "popular", "newest"];

export const DURATION_BUCKETS = {
  short: { max: 180 },
  medium: { min: 180, max: 360 },
  long: { min: 360 },
} as const;
export type DurationBucket = keyof typeof DURATION_BUCKETS;

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function readAll(params: Params, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key).flatMap((v) => v.split(","));
  const v = params[key];
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((x) => x.split(","));
}

export interface ParsedFilters {
  filter: TrackFilter;
  sort: TrackSort;
  /** The active selections, echoed back for rendering the filter bar. */
  selected: Partial<Record<TaxonomyKind, string[]>> & { energy?: EnergyLevel[]; duration?: DurationBucket };
}

/**
 * Resolves each selected slug to its whole subtree, so filtering by "Wedding"
 * also matches tracks tagged "First Dance". Multiple values within one kind
 * are OR'd (Calm or Dreamy); different kinds are AND'd (Calm and Piano).
 *
 * `base` lets a detail page pin its own term (a genre page is always that
 * genre) while still accepting further filters on top.
 */
export async function parseDiscoveryFilters(params: Params, base: TrackFilter = {}): Promise<ParsedFilters> {
  const selected: ParsedFilters["selected"] = {};
  const wanted: { kind: TaxonomyKind; slugs: string[] }[] = [];

  for (const [param, kind] of Object.entries(FILTER_PARAMS)) {
    const slugs = [...new Set(readAll(params, param).map((s) => s.trim().toLowerCase()).filter(Boolean))];
    if (slugs.length) wanted.push({ kind, slugs });
  }

  const anyOfGroups = [...(base.anyOfGroups ?? [])];

  if (wanted.length > 0) {
    // One query for every term of the kinds involved, then walk subtrees in
    // memory — rather than a query per selected slug.
    const terms = await db.taxonomyTerm.findMany({
      where: { kind: { in: wanted.map((w) => w.kind) }, isActive: true },
      select: { id: true, kind: true, slug: true, parentId: true },
    });
    const children = new Map<string, string[]>();
    for (const t of terms) {
      if (t.parentId) children.set(t.parentId, [...(children.get(t.parentId) ?? []), t.id]);
    }
    const subtree = (id: string): string[] => [id, ...(children.get(id) ?? []).flatMap(subtree)];

    for (const { kind, slugs } of wanted) {
      const matched = terms.filter((t) => t.kind === kind && slugs.includes(t.slug));
      if (matched.length === 0) continue;
      selected[kind] = matched.map((t) => t.slug);
      anyOfGroups.push([...new Set(matched.flatMap((t) => subtree(t.id)))]);
    }
  }

  const energy = readAll(params, "energy").filter((e): e is EnergyLevel => ENERGY_VALUES.includes(e as EnergyLevel));
  if (energy.length) selected.energy = energy;

  const durationParam = readAll(params, "duration")[0] as DurationBucket | undefined;
  const duration = durationParam && durationParam in DURATION_BUCKETS ? DURATION_BUCKETS[durationParam] : undefined;
  if (duration) selected.duration = durationParam;

  const sortParam = readAll(params, "sort")[0] as TrackSort | undefined;
  const sort = sortParam && SORT_VALUES.includes(sortParam) ? sortParam : "recommended";

  const query = readAll(params, "q").join(" ").trim() || base.query;

  return {
    sort,
    selected,
    filter: {
      ...base,
      anyOfGroups,
      energy: energy.length ? energy : base.energy,
      minDurationSec: duration && "min" in duration ? duration.min : base.minDurationSec,
      maxDurationSec: duration && "max" in duration ? duration.max : base.maxDurationSec,
      query,
    },
  };
}
