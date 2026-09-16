export const OFFLINE_AUDIO_CACHE = "lumen-audio-v1";

function isCacheStorageSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

export async function cacheAudioResponse(url: string, response: Response): Promise<void> {
  if (!isCacheStorageSupported()) throw new Error("Offline storage isn't supported in this browser.");
  const cache = await caches.open(OFFLINE_AUDIO_CACHE);
  await cache.put(url, response);
}

export async function isAudioCached(url: string): Promise<boolean> {
  if (!isCacheStorageSupported()) return false;
  const cache = await caches.open(OFFLINE_AUDIO_CACHE);
  const match = await cache.match(url);
  return !!match;
}

export async function removeCachedAudio(url: string): Promise<void> {
  if (!isCacheStorageSupported()) return;
  const cache = await caches.open(OFFLINE_AUDIO_CACHE);
  await cache.delete(url);
}

export async function clearAudioCache(): Promise<void> {
  if (!isCacheStorageSupported()) return;
  await caches.delete(OFFLINE_AUDIO_CACHE);
}
