// Lumen service worker — minimal, deliberately narrow scope:
//   1. Serve downloaded track audio from Cache Storage when offline
//      (the actual caching happens in lib/offline/manager.ts when the
//      user presses Download; this worker just knows to look there).
//   2. Cache a small app-shell so the site still opens offline.
// Bump CACHE_VERSION whenever the shell list below changes.

const CACHE_VERSION = "v1";
const SHELL_CACHE = `lumen-shell-${CACHE_VERSION}`;
const AUDIO_CACHE = "lumen-audio-v1";
const OFFLINE_URL = "/offline.html";

const SHELL_ASSETS = ["/", OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

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
            .filter((key) => key.startsWith("lumen-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// <audio> issues Range requests when seeking. The Cache API matches by URL
// only and always returns the full cached response, so without this an
// offline seek would silently fail (or force a full re-fetch) — slice the
// cached blob ourselves and answer with a real 206 Partial Content.
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
  const cachedAudio = await audioCache.match(request);
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

  // Page navigations: network-first, falling back to the offline shell.
  if (request.mode === "navigate") {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(SHELL_CACHE);
      return (await cache.match(request)) || (await cache.match(OFFLINE_URL));
    }
  }

  // Everything else same-origin (static assets): stale-while-revalidate.
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
