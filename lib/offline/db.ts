import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PlayerTrack } from "@/lib/types";

export interface OfflineTrackRecord {
  track: PlayerTrack;
  byteSize: number;
  downloadedAt: number;
  /**
   * The artwork, kept so downloads don't show blank covers without a
   * connection.
   *
   * Bytes rather than a Blob: WebKit refuses to store a Blob in IndexedDB and
   * aborts the whole transaction to say so — with a null error, so it arrives
   * as an unexplained failure. That took every download on iPhone with it,
   * artwork and audio alike, even though the audio had already been cached.
   * ArrayBuffers store fine everywhere; the Blob is rebuilt on the way out.
   */
  coverBytes?: ArrayBuffer;
  /** What downloads saved before the move to bytes. Read, never written. */
  coverBlob?: Blob;
  /** The artwork's media type, which the bytes alone don't carry. */
  coverType?: string;
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
