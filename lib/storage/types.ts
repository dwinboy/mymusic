export type StorageFolder = "audio" | "audio-original" | "audio-download" | "covers" | "avatars";

export interface StoredFile {
  /** Publicly reachable URL (or path) to the file. */
  url: string;
  /** Storage key/path, needed to delete the file later. */
  key: string;
  size: number;
}

export interface StorageDriver {
  /**
   * Persist a file and return its public URL + storage key.
   */
  put(params: {
    folder: StorageFolder;
    filename: string;
    contentType: string;
    data: Buffer;
  }): Promise<StoredFile>;

  /**
   * Remove a previously stored file. Safe to call on a missing key.
   */
  remove(key: string): Promise<void>;
}
