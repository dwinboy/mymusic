// Sources the photography bundled for discovery categories.
//
// Candidates come from Openverse, restricted to CC0 and public-domain-mark
// images from StockSnap — genuine photography that needs no attribution. Each
// category has a few hand-written search phrases in
// scripts/category-photos.queries.json; the first result that isn't already
// used elsewhere wins, so no two categories share a photo.
//
//   node scripts/category-photos.mjs           # fill in anything missing
//   node scripts/category-photos.mjs GENRE:jazz OCCASION:vows   # redo these
//
// Photos already in public/categories are kept. To replace one, pass its key:
// the photo it was using is recorded in scripts/category-photos.rejected.json
// so a re-run can't land on it again. Writes public/categories/*.jpg, the
// credits file beside them, and lib/media/category-photos.ts.
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PHOTOS_DIR = path.join(ROOT, "public/categories");
const CREDITS = path.join(PHOTOS_DIR, "credits.json");
const REJECTED = path.join(ROOT, "scripts/category-photos.rejected.json");
const QUERIES = path.join(ROOT, "scripts/category-photos.queries.json");
const MODULE = path.join(ROOT, "lib/media/category-photos.ts");

const UA = "VibeBanger/1.0 (category artwork)";
// Clipart and illustrations read as stock filler next to real photography.
const NOT_A_PHOTO = /(clipart|vector|illustration|icon|drawing|cartoon|logo|pattern|sketch|painting|png transparent)/i;

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
};

/** Openverse ANDs its terms, so a precise phrase often matches nothing on a
 *  single source — fall back to shorter prefixes, but never to one word,
 *  which drifts ("white lilies" → "white" → a white desk). */
function searchPhrases(queries) {
  const variants = queries.map((q) => q.split(" "));
  const phrases = [];
  for (let n = Math.max(...variants.map((v) => v.length)); n >= 2; n--) {
    for (const words of variants) if (words.length >= n) phrases.push(words.slice(0, n).join(" "));
  }
  return [...new Set([...phrases, ...queries.filter((q) => !q.includes(" "))])];
}

async function candidates(query) {
  const params = new URLSearchParams({
    q: query,
    license: "cc0,pdm",
    source: "stocksnap",
    size: "large",
    mature: "false",
    page_size: "20",
  });
  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const { results = [] } = await res.json();
  return results
    .filter((r) => !NOT_A_PHOTO.test(`${r.title ?? ""} ${(r.tags ?? []).map((t) => t.name).join(" ")}`))
    .filter((r) => (r.width ?? 0) >= 1200 && (r.height ?? 0) >= 800);
}

/** 4:3 at the width the largest tile renders, cropped on the subject. */
async function install(result, file) {
  const res = await fetch(result.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} fetching ${result.url}`);
  await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(1200, 900, { fit: "cover", position: "attention" })
    .jpeg({ quality: 70, mozjpeg: true })
    .toFile(file);
}

const queries = await readJson(QUERIES, {});
const credits = await readJson(CREDITS, []);
const rejected = new Set(await readJson(REJECTED, []));
const byKey = new Map(credits.map((c) => [`${c.kind}|${c.slug}`, c]));

// Keys named on the command line are re-sourced; their current photo is
// retired so the search can't choose it again.
for (const arg of process.argv.slice(2)) {
  const key = arg.replace(":", "|");
  const existing = byKey.get(key);
  if (existing) {
    rejected.add(existing.id);
    await unlink(path.join(PHOTOS_DIR, existing.file)).catch(() => {});
    byKey.delete(key);
  }
}

await mkdir(PHOTOS_DIR, { recursive: true });
const used = new Set([...byKey.values()].map((c) => c.id));
const missing = [];

for (const key of Object.keys(queries)) {
  if (byKey.has(key)) continue;
  const [kind, slug] = key.split("|");
  const file = `${kind.toLowerCase()}-${slug}.jpg`;
  let chosen = null;

  for (const phrase of searchPhrases(queries[key])) {
    for (const result of await candidates(phrase)) {
      if (used.has(result.id) || rejected.has(result.id)) continue;
      try {
        await install(result, path.join(PHOTOS_DIR, file));
        chosen = result;
        break;
      } catch {
        // Unreachable or undecodable — try the next candidate.
      }
    }
    if (chosen) break;
  }

  if (!chosen) {
    missing.push(key);
    continue;
  }
  used.add(chosen.id);
  byKey.set(key, {
    file,
    kind,
    slug,
    id: chosen.id,
    title: chosen.title ?? null,
    creator: chosen.creator ?? null,
    license: `${chosen.license}${chosen.license_version ? ` ${chosen.license_version}` : ""}`,
    source: chosen.source,
    sourceUrl: chosen.foreign_landing_url,
  });
  process.stdout.write(".");
}

const entries = [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b));
await writeFile(CREDITS, JSON.stringify(entries.map(([, c]) => c), null, 2) + "\n");
await writeFile(REJECTED, JSON.stringify([...rejected], null, 2) + "\n");
await writeFile(
  MODULE,
  `/**
 * Photography bundled with the app for discovery categories, so every genre,
 * mood, activity and occasion has a real image from the first visit — before
 * any track has been tagged and before an admin has uploaded artwork.
 *
 * All of it is public domain (CC0 or the public domain mark) and needs no
 * attribution; provenance is recorded in public/categories/credits.json.
 *
 * Generated by scripts/category-photos.mjs — edit that, not this.
 */
import type { TaxonomyKind } from "@/lib/generated/prisma/client";

const PHOTOS: Record<string, string> = {
${entries.map(([key, c]) => `  "${key.replace("|", ":")}": "${c.file}",`).join("\n")}
};

/** The bundled photo for a category, or null where none was curated. */
export function categoryPhoto(kind: TaxonomyKind, slug: string): string | null {
  const file = PHOTOS[\`\${kind}:\${slug}\`];
  return file ? \`/categories/\${file}\` : null;
}

/**
 * The bundled photo for whichever category goes by this slug, for things
 * named after a category without being one — an editorial playlist called
 * "Deep Focus", say. Exact matches only, so a photo only ever stands in for
 * the thing it depicts.
 */
export function categoryPhotoForSlug(slug: string): string | null {
  const match = Object.keys(PHOTOS).find((key) => key.endsWith(\`:\${slug}\`));
  return match ? \`/categories/\${PHOTOS[match]}\` : null;
}
`
);

console.log(`\n${entries.length} categories illustrated${missing.length ? ` — no photo found for: ${missing.join(", ")}` : ""}`);
