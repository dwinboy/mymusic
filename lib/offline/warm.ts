import { getAllOfflineTracks } from "./db";

const LAST_WARM_KEY = "vibebanger:offline-pages-warmed-at";
const WARM_INTERVAL_MS = 12 * 60 * 60 * 1000;

/**
 * Asks the service worker to save a fresh offline copy of the Downloads page.
 * Runs after each download, and on app start at most twice a day for anyone
 * with downloads, so the copy keeps up with deploys without refetching the
 * page on every visit.
 */
export async function warmOfflinePages({ force = false }: { force?: boolean } = {}) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!force) {
    try {
      const last = Number(window.localStorage.getItem(LAST_WARM_KEY) ?? 0);
      if (Date.now() - last < WARM_INTERVAL_MS) return;
    } catch {
      // Storage unavailable: fall through and warm.
    }
    if ((await getAllOfflineTracks().catch(() => [])).length === 0) return;
  }

  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: "warm-offline-pages" });
  try {
    window.localStorage.setItem(LAST_WARM_KEY, String(Date.now()));
  } catch {
    // Non-critical.
  }
}
