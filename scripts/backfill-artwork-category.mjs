/**
 * Fills in tracks.artworkCategory for tracks classified before the column
 * existed, so they pick up a stand-in photo without being edited by hand.
 *
 *   node scripts/backfill-artwork-category.mjs          # report only
 *   node scripts/backfill-artwork-category.mjs --write  # apply
 *
 * Railway's Postgres has no public endpoint, so against production this runs
 * inside the deployment:
 *
 *   railway ssh --service web
 *   node scripts/backfill-artwork-category.mjs --write
 *
 * Safe to re-run: it recomputes every track and only writes what changed,
 * which is also how to repair keys after a category is renamed.
 */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "../lib/generated/prisma/client.js";

const PREFERENCE = ["GENRE", "MOOD", "ACTIVITY", "OCCASION"];
const write = process.argv.includes("--write");

// Read from the credits manifest rather than lib/media/category-photos.ts, so
// this runs on plain node inside the deployment with no TypeScript loader.
const credits = JSON.parse(await readFile(new URL("../public/categories/credits.json", import.meta.url), "utf8"));
const illustrated = new Set(credits.map((photo) => `${photo.kind}:${photo.slug}`));

const db = new PrismaClient();
try {
  const tracks = await db.track.findMany({
    select: {
      id: true,
      title: true,
      artworkCategory: true,
      terms: {
        where: { term: { isActive: true } },
        select: { isPrimary: true, term: { select: { kind: true, slug: true } } },
        orderBy: { isPrimary: "desc" },
      },
    },
  });

  let changed = 0;
  for (const track of tracks) {
    let chosen = null;
    for (const kind of PREFERENCE) {
      const match = track.terms.find((t) => t.term.kind === kind && illustrated.has(`${kind}:${t.term.slug}`));
      if (match) {
        chosen = `${kind}:${match.term.slug}`;
        break;
      }
    }
    if (chosen === track.artworkCategory) continue;
    changed++;
    console.log(`${track.title}: ${track.artworkCategory ?? "—"} -> ${chosen ?? "—"}`);
    if (write) await db.track.update({ where: { id: track.id }, data: { artworkCategory: chosen } });
  }

  console.log(
    changed === 0
      ? `\n${tracks.length} tracks, all already correct.`
      : `\n${changed} of ${tracks.length} tracks ${write ? "updated" : "would change — re-run with --write"}.`
  );
} finally {
  await db.$disconnect();
}
