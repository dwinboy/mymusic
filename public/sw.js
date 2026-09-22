// Vibe Banger service worker — deliberately narrow scope:
//   1. Serve downloaded track audio from Cache Storage when offline
//      (the actual caching happens in lib/offline/manager.ts when the
//      user presses Download; this worker just knows to look there).
//   2. Keep the Downloads page usable offline: a complete copy of the page
//      and the build files it needs, refreshed on request from the app.
//   3. An offline fallback page for everything else.
// Bump CACHE_VERSION whenever the shell list below changes.

// v2: v1 cached every same-origin GET, including page data and API responses.
// v3: dropped "/" from the shell (a stale homepage offline, full of tracks that
// can't play) in favour of the offline page pointing to Downloads.
const CACHE_VERSION = "v3";
// Not versioned: everything in it is content-hashed, so a name can never
// hold stale content and a new build simply adds new names.
const STATIC_CACHE = "vibebanger-static-v1";
const STATIC_MAX_ENTRIES = 500;
const SHELL_CACHE = `vibebanger-shell-${CACHE_VERSION}`;
const AUDIO_CACHE = "vibebanger-audio-v1";
const PAGES_CACHE_PREFIX = "vibebanger-offline-pages-";
const OFFLINE_URL = "/offline.html";

const SHELL_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

// Pages that work with no connection because they render from data stored
// on the device. Their HTML carries no account data (the session loads
// client-side), so a cached copy is safe to keep.
const OFFLINE_PAGES = ["/downloads"];

// On a flaky connection, don't leave someone staring at a spinner when a
// working offline copy exists.
const OFFLINE_PAGE_NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("vibebanger-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "warm-offline-pages") {
    event.waitUntil(warmOfflinePages());
  }
});

/**
 * Snapshots the offline pages plus every build file they reference (scripts,
 * styles, and the fonts those styles load) into a fresh cache, and only
 * replaces the previous snapshot once the new one is complete. A snapshot is
 * self-consistent: build files are content-hashed, so an old page keeps
 * working offline after a deploy until the next refresh replaces it.
 */
let warming = null;
function warmOfflinePages() {
  if (!warming) {
    warming = doWarm().finally(() => {
      warming = null;
    });
  }
  return warming;
}

async function doWarm() {
  const name = `${PAGES_CACHE_PREFIX}${Date.now()}`;
  const cache = await caches.open(name);
  try {
    const assets = new Set();
    for (const path of OFFLINE_PAGES) {
      const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`${path} ${response.status}`);
      collectBuildFiles(await response.clone().text(), assets);
      await cache.put(path, response);
    }

    const styles = [];
    // Every script and stylesheet is required: a page missing one would load
    // offline and then fail, which is worse than the offline page.
    await Promise.all(
      [...assets].map(async (asset) => {
        const response = await fetch(asset);
        if (!response.ok) throw new Error(`${asset} ${response.status}`);
        if (asset.endsWith(".css")) styles.push(await response.clone().text());
        await cache.put(asset, response);
      })
    );
    const fonts = new Set();
    for (const css of styles) collectBuildFiles(css, fonts);
    await Promise.all(
      [...fonts].filter((f) => !assets.has(f)).map((font) => cache.add(font).catch(() => {}))
    );
  } catch {
    await caches.delete(name);
    return;
  }

  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(PAGES_CACHE_PREFIX) && key !== name).map((key) => caches.delete(key)));
}

function collectBuildFiles(text, into) {
  for (const match of text.matchAll(/\/_next\/static\/[^"'\s)\\?#]+/g)) into.add(match[0]);
}

// <audio> issues Range requests when seeking. The Cache API matches by URL
// only and always returns the full cached response, so without this an
// offline seek would silently fail (or force a full re-fetch) — slice the
// cached blob ourselves and answer with a real 206 Partial Content.
/**
 * The same track, saved as a different encode.
 *
 * A download saves whichever encode the quality setting asked for at the
 * time. Change that setting afterwards and the player asks for the other
 * file, which was never cached — so a download that was working stopped
 * playing offline. Both encodes live under the track's own id
 * (music/streaming/<id>/… and music/downloads/<id>/…), so when the exact
 * URL isn't cached we serve whatever we do have for that track. Slightly
 * wrong bitrate beats silence, and it repairs downloads already sitting on
 * people's devices without asking them to fetch anything again.
 */
/**
 * Keeps the build-file cache bounded. Entries come back in insertion order,
 * so the oldest go first — which after a few deploys is exactly the files
 * belonging to builds nobody is running any more.
 */
async function trimStatic(cache) {
  const keys = await cache.keys();
  if (keys.length <= STATIC_MAX_ENTRIES) return;
  for (const key of keys.slice(0, keys.length - STATIC_MAX_ENTRIES)) {
    await cache.delete(key);
  }
}

function trackIdFromAudioUrl(url) {
  const match = url.pathname.match(/\/music\/(?:streaming|downloads)\/([^/]+)\//);
  return match ? match[1] : null;
}

async function matchOtherEncoding(audioCache, request) {
  const wanted = trackIdFromAudioUrl(new URL(request.url));
  if (!wanted) return undefined;
  for (const key of await audioCache.keys()) {
    if (trackIdFromAudioUrl(new URL(key.url)) === wanted) return audioCache.match(key);
  }
  return undefined;
}

async function serveCachedAudio(request, cached) {
  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) return cached;

  const blob = await cached.blob();
  const size = blob.size;
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) return cached;

  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;

  if (Number.isNaN(start) || start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const slice = blob.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": blob.type || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

function isStaticAsset(url) {
  if (url.search.includes("_rsc=")) return false;
  return url.pathname.startsWith("/icons/") || SHELL_ASSETS.includes(url.pathname);
}

async function matchOfflinePage(path) {
  // Newest first; a snapshot still being written falls through to the
  // previous complete one.
  const snapshots = (await caches.keys()).filter((key) => key.startsWith(PAGES_CACHE_PREFIX)).sort().reverse();
  for (const name of snapshots) {
    const match = await (await caches.open(name)).match(path, { ignoreSearch: true });
    if (match) return match;
  }
  return undefined;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(handleFetch(event, request));
});

async function handleFetch(event, request) {
  // Explicitly-downloaded audio lives here regardless of where it was
  // fetched from (local /uploads/... in dev, or a cross-origin R2 public
  // URL in production) — lib/offline/manager.ts is what decides what gets
  // written into this cache, so a lookup here is always intentional.
  // Checked first and independent of origin, unlike everything below.
  const audioCache = await caches.open(AUDIO_CACHE);
  const cachedAudio = (await audioCache.match(request)) || (await matchOtherEncoding(audioCache, request));
  if (cachedAudio) return serveCachedAudio(request, cachedAudio);

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Cross-origin, not a downloaded track (R2 audio not yet saved for
    // offline, Cloudinary images, etc.) — pass straight through.
    try {
      return await fetch(request);
    } catch {
      return new Response(null, { status: 503, statusText: "Offline" });
    }
  }

  // Page navigations: network-first, falling back to a saved offline copy of
  // the page if there is one, and the offline page otherwise.
  if (request.mode === "navigate") {
    const savedCopy = OFFLINE_PAGES.includes(url.pathname) ? await matchOfflinePage(url.pathname) : undefined;
    try {
      const network = fetch(request);
      if (!savedCopy) return await network;
      return await Promise.race([
        network,
        new Promise((resolve) => setTimeout(() => resolve(savedCopy), OFFLINE_PAGE_NETWORK_TIMEOUT_MS)),
      ]);
    } catch {
      return savedCopy || (await caches.match(OFFLINE_URL));
    }
  }

  // Build files: content-hashed, so a cached copy can never be stale.
  //
  // Kept here rather than left to the HTTP cache because a deploy removes the
  // running app's files from the server. Without a copy of its own, the first
  // navigation that needed a piece it hadn't already loaded would fail, and
  // the browser would recover with a full page reload — which on a phone
  // means whatever was playing stops, and iOS will not start audio again
  // without a tap. Nothing should stop the music except the person listening.
  if (url.pathname.startsWith("/_next/static/")) {
    const snapshot = await matchOfflinePage(url.pathname);
    if (snapshot) return snapshot;

    const cache = await caches.open(STATIC_CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;

    try {
      const response = await fetch(request);
      // Only real, readable responses: an opaque or error response cached
      // here would break the app until someone cleared their storage.
      if (response.ok && response.type !== "opaque") {
        await cache.put(request, response.clone());
        void trimStatic(cache);
      }
      return response;
    } catch {
      return new Response(null, { status: 503, statusText: "Offline" });
    }
  }

  // Beyond that, only the shell's own files are cached. Page
  // data (?_rsc=) and API responses must always come from the network:
  // serving them from cache makes router.refresh() show the previous render,
  // and would keep one account's data in a cache the next user of the same
  // browser can be served from.
  if (!isStaticAsset(url)) {
    return fetch(request);
  }

  // Static assets: stale-while-revalidate.
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}
