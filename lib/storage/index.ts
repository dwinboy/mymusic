import type { StorageDriver } from "./types";

let driver: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (driver) return driver;

  if (process.env.STORAGE_DRIVER === "s3") {
    const { S3StorageDriver } = require("./s3") as typeof import("./s3");
    driver = new S3StorageDriver();
  } else {
    const { LocalStorageDriver } = require("./local") as typeof import("./local");
    driver = new LocalStorageDriver();
  }

  return driver;
}

export type { StorageDriver, StoredFile, StorageFolder } from "./types";
