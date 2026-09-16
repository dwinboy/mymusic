import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, StoredFile } from "./types";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

/**
 * Dev-friendly storage driver that writes to /public/uploads so files are
 * served directly by Next.js. Swap STORAGE_DRIVER=s3 in production; nothing
 * outside this module knows which driver is active.
 */
export class LocalStorageDriver implements StorageDriver {
  async put({
    folder,
    filename,
    data,
  }: {
    folder: string;
    filename: string;
    contentType: string;
    data: Buffer;
  }): Promise<StoredFile> {
    const dir = path.join(UPLOADS_ROOT, folder);
    await mkdir(dir, { recursive: true });
    const key = `${folder}/${filename}`;
    await writeFile(path.join(dir, filename), data);

    return {
      url: `/uploads/${key}`,
      key,
      size: data.byteLength,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(path.join(UPLOADS_ROOT, key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}
