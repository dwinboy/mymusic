import { getTerms, type TaxonomyKind } from "@/lib/taxonomy";
import { FILTER_PARAMS } from "@/lib/discovery-filters";
import type { FilterDimension } from "@/components/discovery/filter-bar";

const KIND_LABEL: Record<TaxonomyKind, string> = {
  GENRE: "Genre",
  MOOD: "Mood",
  ACTIVITY: "Activity",
  OCCASION: "Occasion",
  INSTRUMENT: "Instrument",
  LANGUAGE: "Language",
  VOCAL: "Vocals",
  TAG: "Tag",
};

const PARAM_FOR_KIND = Object.fromEntries(Object.entries(FILTER_PARAMS).map(([param, kind]) => [kind, param])) as Record<
  TaxonomyKind,
  string
>;

const ENERGY_DIMENSION: FilterDimension = {
  param: "energy",
  label: "Energy",
  options: [
    { value: "VERY_LOW", label: "Very low" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "VERY_HIGH", label: "Very high" },
  ],
};

const DURATION_DIMENSION: FilterDimension = {
  param: "duration",
  label: "Duration",
  single: true,
  options: [
    { value: "short", label: "Under 3 min" },
    { value: "medium", label: "3–6 min" },
    { value: "long", label: "Over 6 min" },
  ],
};

/**
 * Filter dimensions for a discovery page, built from the live taxonomy. A page
 * lists the kinds it wants and omits the one it's already scoped to — a genre
 * page doesn't offer a genre filter.
 */
export async function buildFilterDimensions(
  kinds: TaxonomyKind[],
  extras: { energy?: boolean; duration?: boolean } = { energy: true, duration: true }
): Promise<FilterDimension[]> {
  const termLists = await Promise.all(kinds.map((kind) => getTerms(kind)));

  const dimensions: FilterDimension[] = kinds.map((kind, i) => ({
    param: PARAM_FOR_KIND[kind],
    label: KIND_LABEL[kind],
    options: termLists[i].map((t) => ({ value: t.slug, label: t.name })),
  }));

  if (extras.energy) dimensions.push(ENERGY_DIMENSION);
  if (extras.duration) dimensions.push(DURATION_DIMENSION);
  return dimensions;
}

export { KIND_LABEL };
