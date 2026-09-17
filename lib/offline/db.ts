import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PlayerTrack } from "@/lib/types";

export interface OfflineTrackRecord {
  track: PlayerTrack;
  byteSize: number;
  downloadedAt: number;
}

interface VibeBangerOfflineDB extends DBSchema {
  tracks: {
    key: string;
    value: OfflineTrackRecord;
  };
}

const DB_NAME = "vibebanger-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VibeBangerOfflineDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser."));
  }
  if (!dbPromise) {
    dbPromise = openDB<VibeBangerOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("tracks")) {
          db.createObjectStore("tracks", { keyPath: "track.id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function putOfflineTrack(record: OfflineTrackRecord) {
  const db = await getDb();
  await db.put("tracks", record);
}

export async function removeOfflineTrack(trackId: string) {
  const db = await getDb();
  await db.delete("tracks", trackId);
}

export async function getOfflineTrack(trackId: string): Promise<OfflineTrackRecord | undefined> {
  const db = await getDb();
  return db.get("tracks", trackId);
}

export async function getAllOfflineTracks(): Promise<OfflineTrackRecord[]> {
  const db = await getDb();
  const all = await db.getAll("tracks");
  return all.sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export async function clearAllOfflineTracks() {
  const db = await getDb();
  await db.clear("tracks");
}
