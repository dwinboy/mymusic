/**
 * Keeping downloads downloaded.
 *
 * Cache Storage and IndexedDB — where a saved track's audio and metadata live
 * — are "best effort" by default: a browser short on space may evict them
 * without asking and without telling anyone. For a page of music someone
 * saved for a flight, that is the one failure the feature cannot have.
 *
 * `navigator.storage.persist()` moves the origin to durable storage, which is
 * never evicted automatically. Chrome and Edge grant it silently to installed
 * or frequently-used sites, Firefox asks once, and Safari grants it on use.
 * Asking at the moment someone saves a track is both the most likely time to
 * be granted and the only honest time to ask — it is the action that depends
 * on it.
 *
 * Everything here degrades to "unknown" rather than throwing: the Storage API
 * is missing in some browsers and blocked in private windows, and a download
 * must still work when it cannot be protected.
 */

export interface StorageState {
  /** Bytes this origin is using, or null when the browser won't say. */
  usage: number | null;
  /** Bytes it may use in total, or null when the browser won't say. */
  quota: number | null;
  /** Whether the browser has promised not to evict this data on its own. */
  persisted: boolean;
}

function storageApi(): StorageManager | null {
  if (typeof navigator === "undefined" || !navigator.storage) return null;
  return navigator.storage;
}

/**
 * Asks for durable storage if we don't already have it. Returns whether the
 * data is protected afterwards. Never throws, and never asks twice in a
 * browser that already said yes.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  const storage = storageApi();
  if (!storage?.persist || !storage.persisted) return false;
  try {
    if (await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageState(): Promise<StorageState | null> {
  const storage = storageApi();
  if (!storage) return null;
  try {
    const estimate = storage.estimate ? await storage.estimate() : {};
    return {
      usage: typeof estimate.usage === "number" ? estimate.usage : null,
      quota: typeof estimate.quota === "number" ? estimate.quota : null,
      persisted: storage.persisted ? await storage.persisted() : false,
    };
  } catch {
    return null;
  }
}

/** "1.2 GB" — sized for reading, not for accounting. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
