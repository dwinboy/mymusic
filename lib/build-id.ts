import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

/**
 * The id `next build` wrote for the running build. Pages embed it and the
 * version endpoint reports it, so an open tab can tell when a newer
 * deployment has gone live. Read from the file rather than an env var: the
 * file is fixed at build time, so the server and the pages it rendered can't
 * disagree about it.
 */
export function getBuildId(): string {
  if (cached === null) {
    try {
      cached = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim() || "development";
    } catch {
      cached = "development";
    }
  }
  return cached;
}
