// Generates every icon and splash image the site and the installed app need,
// all from one master logo so they can never drift apart.
//
//   node scripts/brand-icons.mjs                     # regenerate from the master
//   node scripts/brand-icons.mjs path/to/new-logo.png  # adopt a new master
//
// The master lives at public/brand/logo.png. Sources are composited onto the
// app's own canvas colour rather than left transparent: the logo is a glowing
// mark that reads against near-black, and a transparent version would show a
// halo wherever a platform paints its own light background behind it.
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER = path.join(ROOT, "public/brand/logo.png");
// The artwork carries its own pure-black ground, so everything it is
// composited onto matches it exactly — padding it with the app's slightly
// lighter canvas colour left a visible square seam around the mark. Against
// the app's own near-black chrome the difference is imperceptible.
const CANVAS = "#000000";

/**
 * How much of an icon's width the mark is given.
 *
 * The master frames the mark with room to spare — it reaches 73% of the
 * width and only 50% of the height, so a quarter of the square was empty
 * black above and below it and the icon read small on a home screen beside
 * apps whose marks fill theirs. Composited from the trimmed artwork instead,
 * the width is the only thing to set: the mark is half again as wide as it
 * is tall, so width is always what runs out first.
 *
 * 0.88 for an ordinary icon — iOS rounds the corners of these and the
 * corners are empty either way. 0.64 for a maskable one, which Android may
 * crop to a circle 80% across: a rectangle this wide only stays inside that
 * circle up to about 0.66, and the last two points are the margin for a
 * launcher that crops harder than the spec.
 */
const ICON_MARK_WIDTH = 0.88;
const MASKABLE_MARK_WIDTH = 0.64;

/** Square icon: the mark as large as it goes, on the canvas colour. */
async function icon(size, out) {
  await markOnCanvas(size, size, Math.round(size * ICON_MARK_WIDTH), out);
}

/**
 * Maskable icon: Android crops these to whatever shape the launcher uses, so
 * the mark sits inside the safe zone and only background gets trimmed.
 */
async function maskable(size, out) {
  await markOnCanvas(size, size, Math.round(size * MASKABLE_MARK_WIDTH), out);
}

/** The trimmed mark, centred at the given width, on a flat black square. */
async function markOnCanvas(width, height, markWidth, out, png = {}) {
  const mark = await sharp(await trimmedMark()).resize({ width: markWidth }).png().toBuffer();
  await sharp({ create: { width, height, channels: 4, background: CANVAS } })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9, ...png })
    .toFile(out);
}

/**
 * iOS launch image: the mark centred on the canvas colour, at device pixels.
 * 0.42 of the short edge against the old 0.38 of a frame that was itself
 * mostly padding, so the mark lands noticeably larger than it did.
 */
async function splash(width, height, out) {
  // A mark on flat colour quantises without visible loss, and a launch image
  // is fetched before anything else is on screen.
  await markOnCanvas(width, height, Math.round(Math.min(width, height) * 0.42), out, { palette: true, quality: 90 });
}

/**
 * The mark with its ground taken away, for use inside the app itself.
 *
 * Every other output here is composited onto black on purpose — a glowing
 * mark needs a dark ground, and platforms paint their own backgrounds behind
 * an app icon. In the app's own chrome that ground is already there, so the
 * black square was just a square: visible against the near-black header and
 * boxing in a mark that should sit on the bar directly.
 *
 * The artwork is light emitted on black, so brightness is opacity: the
 * strongest channel becomes alpha and the colour is left exactly as it is.
 * Dividing the colour back out by that alpha — the textbook way to recover
 * straight alpha — turns the faint outer glow into coloured speckle, because
 * at an alpha of two or three it is amplifying compression noise a hundred
 * times. Left alone, the pixels are already the right colour for compositing
 * over a dark ground, which is the only ground the app ever puts it on.
 *
 * Anything dimmer than the noise floor is dropped outright, then the result
 * is trimmed so the file is the mark and nothing else — which is what makes
 * a CSS height mean the height of what you can actually see.
 */
const GLOW_NOISE_FLOOR = 14;

/**
 * The mark alone, at the master's own resolution — every icon, launch image
 * and the web mark is composed from this one buffer, so none of them can
 * frame it differently by accident. Computed once.
 */
let trimmedPromise = null;
function trimmedMark() {
  trimmedPromise ??= (async () => {
    const { data, info } = await sharp(MASTER).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const rgba = Buffer.alloc(width * height * 4);

    for (let i = 0, o = 0; i < data.length; i += channels, o += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const alpha = Math.max(r, g, b);
      if (alpha < GLOW_NOISE_FLOOR) continue; // Buffer.alloc already zeroed it
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = alpha;
    }

    return sharp(rgba, { raw: { width, height, channels: 4 } })
      .trim({ threshold: 2 })
      .png()
      .toBuffer();
  })();
  return trimmedPromise;
}

async function transparentMark(out) {
  await sharp(await trimmedMark())
    // Displayed at a few dozen pixels tall; a 1024px master is far more than
    // any screen asks for and costs half a megabyte to carry.
    .resize({ width: 512, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(out);
}

/**
 * iOS only shows a launch image when a media query matches the device
 * exactly, so the list is CSS pixels plus pixel ratio. Shared with the app,
 * which renders the matching <link> tags — a size generated here with no tag
 * pointing at it would never be shown.
 */
const APPLE_SPLASH = JSON.parse(await readFile(path.join(ROOT, "lib/apple-splash.json"), "utf8"));


if (import.meta.url === `file://${process.argv[1]}`) {
  // A path argument replaces the master; otherwise regenerate from the one on disk.
  const incoming = process.argv[2];
  await mkdir(path.join(ROOT, "public/brand"), { recursive: true });
  if (incoming) {
    await sharp(incoming).resize(1024, 1024, { fit: "cover" }).png({ compressionLevel: 9 }).toFile(MASTER + ".tmp");
    await copyFile(MASTER + ".tmp", MASTER);
    const { size } = await sharp(MASTER).metadata().then(() => import("node:fs/promises")).then((fs) => fs.stat(MASTER));
    console.log(`master ← ${path.basename(incoming)} (${Math.round(size / 1024)} KB)`);
  }
  await readFile(MASTER); // fail loudly if there is no master to work from

  await mkdir(path.join(ROOT, "public/icons"), { recursive: true });
  await mkdir(path.join(ROOT, "public/splash"), { recursive: true });

  // Favicon and Apple touch icon, picked up automatically from app/.
  await icon(512, path.join(ROOT, "app/icon.png"));
  await icon(180, path.join(ROOT, "app/apple-icon.png"));

  // Referenced by the manifest and the service worker's cached shell.
  for (const size of [16, 32, 192, 512]) await icon(size, path.join(ROOT, `public/icons/icon-${size}.png`));
  await icon(180, path.join(ROOT, "public/icons/apple-icon-180.png"));
  await maskable(512, path.join(ROOT, "public/icons/maskable-512.png"));

  // Used by the app's own header and the sign-in page.
  await transparentMark(path.join(ROOT, "public/brand/mark.png"));

  for (const { w, h, r } of APPLE_SPLASH) {
    await splash(w * r, h * r, path.join(ROOT, `public/splash/${w * r}x${h * r}.png`));
  }

  // The offline page can't run JS or reach the network, so it points at an
  // icon the service worker has already cached.
  const offline = path.join(ROOT, "public/offline.html");
  const html = await readFile(offline, "utf8");
  if (!html.includes("/icons/icon-192.png")) {
    console.log("note: public/offline.html does not reference the logo");
  }

  console.log(`${4 + 2 + 1} icons and ${APPLE_SPLASH.length} launch images written`);
  await writeFile(path.join(ROOT, "public/brand/README.md"), `# Brand assets

\`logo.png\` is the master Vibe Banger mark. Every icon and launch image in
\`public/icons\`, \`public/splash\`, \`app/icon.png\` and \`app/apple-icon.png\` is
generated from it by \`scripts/brand-icons.mjs\` — edit the master and re-run,
never the generated files.
`);
}
