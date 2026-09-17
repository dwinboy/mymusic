import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { FILTER_PARAMS, parseDiscoveryFilters } from "@/lib/discovery-filters";
import { buildTrackWhere, findTracks, termHref, type TaxonomyKind } from "@/lib/taxonomy";
import { PUBLIC_ALBUM_WHERE, PUBLIC_ARTIST_WHERE, PUBLIC_PLAYLIST_WHERE } from "@/lib/public-scope";

/**
 * Search that understands the catalogue's vocabulary. "romantic piano wedding"
 * isn't three title words: it's the Romantic mood, the Piano instrument and
 * the Wedding occasion, and it finds tracks classified that way. Whatever
 * isn't a known term ("moonlight dreams") is matched as text against titles,
 * creators and albums.
 *
 * Deliberately rules over the taxonomy, not a language model: predictable,
 * fast, and the same filters /songs uses, so "See all" shows exactly the
 * set that was searched.
 */

const SEARCHABLE_KINDS: TaxonomyKind[] = ["GENRE", "MOOD", "ACTIVITY", "OCCASION", "INSTRUMENT", "VOCAL", "LANGUAGE"];

/** Words that describe the request rather than the music. */
const FILLER = new Set([
  "music", "musics", "song", "songs", "track", "tracks", "playlist", "playlists", "mix", "mixes",
  "for", "the", "a", "an", "and", "to", "of", "with", "some", "me", "my", "i", "want", "play", "listen", "listening",
]);

const PARAM_FOR_KIND = Object.fromEntries(Object.entries(FILTER_PARAMS).map(([p, k]) => [k, p])) as Record<TaxonomyKind, string>;

export interface SearchTerm {
  id: string;
  kind: TaxonomyKind;
  name: string;
  slug: string;
  /** Term page for genres, moods, activities and occasions; otherwise the filtered Songs page. */
  href: string;
}

const loadTerms = unstable_cache(
  () =>
    db.taxonomyTerm.findMany({
      where: { isActive: true, kind: { in: SEARCHABLE_KINDS } },
      select: { id: true, kind: true, name: true, slug: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ["search-terms"],
  { revalidate: 300, tags: ["taxonomy"] }
);

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function singular(word: string) {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

function toSearchTerm(t: { id: string; kind: TaxonomyKind; name: string; slug: string }): SearchTerm {
  return { ...t, href: termHref(t.kind, t.slug) ?? `/songs?${PARAM_FOR_KIND[t.kind]}=${t.slug}` };
}

export interface Interpretation {
  /** Taxonomy terms recognised in the query. */
  terms: SearchTerm[];
  /** Words left over for text matching, fillers removed. */
  text: string;
}

/** Longest phrase first, so "deep sleep" wins over "sleep" and "hip hop" is one genre. */
export async function interpretQuery(query: string): Promise<Interpretation> {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return { terms: [], text: "" };

  const terms = await loadTerms();
  const byPhrase = new Map<string, typeof terms>();
  for (const term of terms) {
    for (const key of new Set([normalize(term.name), normalize(term.slug)])) {
      if (key.length < 2) continue;
      byPhrase.set(key, [...(byPhrase.get(key) ?? []), term]);
    }
  }

  const matched = new Map<string, (typeof terms)[number]>();
  const leftover: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let consumed = 0;
    for (let n = Math.min(4, tokens.length - i); n >= 1; n--) {
      const words = tokens.slice(i, i + n);
      const exact = words.join(" ");
      const plural = [...words.slice(0, -1), singular(words[n - 1])].join(" ");
      const hits = byPhrase.get(exact) ?? byPhrase.get(plural);
      if (hits) {
        hits.forEach((t) => matched.set(t.id, t));
        consumed = n;
        break;
      }
    }
    if (consumed) {
      i += consumed;
    } else {
      if (!FILLER.has(tokens[i])) leftover.push(tokens[i]);
      i++;
    }
  }

  return { terms: [...matched.values()].map(toSearchTerm), text: leftover.join(" ") };
}

/** The /songs query string for an interpretation: its terms as filters, leftover words as text. */
export function songsQueryFor(interpretation: Interpretation, fallbackText: string) {
  const params = new URLSearchParams();
  if (interpretation.terms.length === 0) {
    params.set("q", fallbackText);
    return params;
  }
  const byParam = new Map<string, string[]>();
  for (const term of interpretation.terms) {
    const param = PARAM_FOR_KIND[term.kind];
    byParam.set(param, [...(byParam.get(param) ?? []), term.slug]);
  }
  for (const [param, slugs] of byParam) params.set(param, slugs.join(","));
  if (interpretation.text) params.set("q", interpretation.text);
  return params;
}

/**
 * The largest subset of the recognised kinds (a mood, an occasion…) that some
 * music carries, preferring the one with more songs. Kinds, not terms, are
 * dropped: two moods named together already mean "either".
 */
async function closestCombination(
  terms: SearchTerm[],
  countFor: (params: URLSearchParams) => Promise<number>,
  fallbackText: string
): Promise<{ terms: SearchTerm[]; params: URLSearchParams; count: number } | null> {
  const kinds = [...new Set(terms.map((t) => t.kind))];
  // A query naming five or more kinds is rare; don't try dozens of combinations.
  if (kinds.length < 2 || kinds.length > 4) return null;

  const subsets: TaxonomyKind[][] = [];
  for (let mask = (1 << kinds.length) - 2; mask > 0; mask--) {
    subsets.push(kinds.filter((_, i) => mask & (1 << i)));
  }
  subsets.sort((a, b) => b.length - a.length);

  let best: { terms: SearchTerm[]; params: URLSearchParams; count: number } | null = null;
  for (const subset of subsets) {
    if (best && subset.length < best.terms.map((t) => t.kind).filter((k, i, all) => all.indexOf(k) === i).length) break;
    const chosen = terms.filter((t) => subset.includes(t.kind));
    const params = songsQueryFor({ terms: chosen, text: "" }, fallbackText);
    const count = await countFor(params);
    if (count > 0 && (!best || count > best.count)) best = { terms: chosen, params, count };
  }
  return best;
}

export interface SearchResults {
  query: string;
  interpretation: Interpretation;
  /**
   * The terms the songs were actually matched on. Fewer than recognised when
   * nothing carries every one of them ("romantic piano wedding" with no
   * piano track): the closest combination that has music.
   */
  appliedTerms: SearchTerm[];
  /** What "See all songs" and the Songs tab page through. */
  songsQuery: string;
  songs: Awaited<ReturnType<typeof findTracks>>["tracks"];
  songTotal: number;
  artists: Prisma.ArtistGetPayload<object>[];
  albums: Prisma.AlbumGetPayload<{ include: { artist: { select: { name: true } } } }>[];
  playlists: Prisma.PlaylistGetPayload<{ include: { user: { select: { name: true } }; _count: { select: { tracks: true } } } }>[];
  /** Recognised terms, plus terms whose name contains the query ("amb" → Ambient). */
  terms: SearchTerm[];
}

export async function search(query: string, limits = { songs: 10, others: 12 }): Promise<SearchResults> {
  const q = query.trim().slice(0, 120);
  const interpretation = await interpretQuery(q);
  let songsParams = songsQueryFor(interpretation, q);

  // Songs whose title, creator or album contains the words as typed come
  // first; then songs classified the way the query describes.
  const typed = await findTracks({ query: q }, { sort: "popular", limit: limits.songs });
  let intent = { tracks: [] as typeof typed.tracks };
  let intentTotal = 0;
  let appliedTerms = interpretation.terms;
  if (interpretation.terms.length > 0) {
    const countFor = async (params: URLSearchParams) =>
      db.track.count({ where: buildTrackWhere((await parseDiscoveryFilters(params)).filter) });

    intentTotal = await countFor(songsParams);
    // "calm moonlight" with no calm track titled "moonlight": the leftover
    // words shouldn't erase an otherwise good match.
    if (intentTotal === 0 && interpretation.text) {
      songsParams = songsQueryFor({ ...interpretation, text: "" }, q);
      intentTotal = await countFor(songsParams);
    }
    if (intentTotal === 0) {
      const closest = await closestCombination(interpretation.terms, countFor, q);
      if (closest) {
        appliedTerms = closest.terms;
        songsParams = closest.params;
        intentTotal = closest.count;
      }
    }
    if (intentTotal > 0) {
      const parsed = await parseDiscoveryFilters(songsParams);
      intent = await findTracks(parsed.filter, { sort: "recommended", limit: limits.songs });
    }
  }

  const seen = new Set<string>();
  const songs = [...typed.tracks, ...intent.tracks].filter((t) => !seen.has(t.id) && seen.add(t.id)).slice(0, limits.songs);
  const typedTotal = await db.track.count({ where: buildTrackWhere({ query: q }) });
  // The Songs tab pages through one query: the interpretation when it
  // matched something, the plain text otherwise.
  const useIntent = interpretation.terms.length > 0 && intentTotal > 0;
  if (!useIntent) songsParams = songsQueryFor({ terms: [], text: "" }, q);

  const textWords = [q, interpretation.text].filter((w, i, all) => w && all.indexOf(w) === i);
  const contains = (field: string) => textWords.map((w) => ({ [field]: { contains: w, mode: "insensitive" as const } }));

  const [artists, albums, playlists, partialTerms] = await Promise.all([
    db.artist.findMany({ where: { ...PUBLIC_ARTIST_WHERE, OR: contains("name") }, orderBy: { name: "asc" }, take: limits.others }),
    db.album.findMany({
      where: { ...PUBLIC_ALBUM_WHERE, OR: [...contains("title"), ...textWords.map((w) => ({ artist: { name: { contains: w, mode: "insensitive" as const } } }))] },
      orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }],
      take: limits.others,
      include: { artist: { select: { name: true } } },
    }),
    db.playlist.findMany({
      where: { ...PUBLIC_PLAYLIST_WHERE, OR: contains("title") },
      orderBy: [{ isFeatured: "desc" }, { kind: "desc" }, { updatedAt: "desc" }],
      take: limits.others,
      include: { user: { select: { name: true } }, _count: { select: { tracks: true } } },
    }),
    q.length >= 3 ? loadTerms() : Promise.resolve([]),
  ]);

  const needle = normalize(q);
  const termsById = new Map(interpretation.terms.map((t) => [t.id, t]));
  for (const term of partialTerms) {
    if (termsById.size >= 16) break;
    if (normalize(term.name).includes(needle)) termsById.set(term.id, toSearchTerm(term));
  }

  return {
    query: q,
    interpretation,
    appliedTerms: useIntent ? appliedTerms : [],
    songsQuery: songsParams.toString(),
    songs,
    songTotal: useIntent ? Math.max(intentTotal, songs.length) : typedTotal,
    artists,
    albums,
    playlists,
    terms: [...termsById.values()],
  };
}
