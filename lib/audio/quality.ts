export type AudioQualityPreference = "standard" | "high";

/**
 * Where the sound-quality choice is kept.
 *
 * Read by the playback engine to pick an encode, by the offline downloader to
 * save the one that will actually be asked for, and written by the settings
 * panel — the same string in three places, which is one place too many to
 * leave as a literal.
 */
export const QUALITY_STORAGE_KEY = "vibebanger:quality";

export function readStoredQuality(): AudioQualityPreference {
  try {
    return window.localStorage.getItem(QUALITY_STORAGE_KEY) === "high" ? "high" : "standard";
  } catch {
    // Storage blocked: standard is the choice that always has a file.
    return "standard";
  }
}
