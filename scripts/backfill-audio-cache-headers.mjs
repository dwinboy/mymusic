/**
 * Adds a Cache-Control header to audio objects already in R2.
 *
 * Objects uploaded before this was added carry no cache directive at all, so
 * a listener replaying a song — or scrubbing back through one — downloads it
 * again. New uploads get the header from lib/media/r2-client.ts; this brings
 * the existing catalogue up to the same state.
 *
 * Safe to interrupt and safe to re-run: it copies each object onto itself with
 * replaced metadata, which changes no bytes, and it skips anything that
 * already carries the header. A half-finished run leaves every object
 * playable, just some of them uncached.
 *
 * Needs the production R2 credentials, which live on Railway rather than in
 * the local .env:
 *
 *   R2_ENDPOINT=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *   R2_BUCKET_NAME=... node scripts/backfill-audio-cache-headers.mjs
 *
 * Reports what it would do and changes nothing. Add --apply to write.
 */

import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

const CACHE_CONTROL = "public, max-age=31536000, immutable";
const PREFIXES = ["music/streaming/", "music/downloads/", "music/originals/"];

const apply = process.argv.includes("--apply");

const required = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing ${missing.join(", ")}. These are the production R2 values from Railway.`);
  process.exit(1);
}

const bucket = process.env.R2_BUCKET_NAME;
const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  // Matches lib/media/r2-client.ts, so this talks to the bucket the same way
  // the app does.
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function* listKeys(prefix) {
  let token;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
    );
    for (const object of page.Contents ?? []) yield object.Key;
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

let seen = 0;
let already = 0;
let changed = 0;
const failed = [];

for (const prefix of PREFIXES) {
  for await (const key of listKeys(prefix)) {
    seen += 1;
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (head.CacheControl === CACHE_CONTROL) {
        already += 1;
        continue;
      }

      if (!apply) {
        changed += 1;
        console.log(`would set  ${key}`);
        continue;
      }

      // Copying an object onto itself with REPLACE rewrites the metadata and
      // leaves the bytes untouched. ContentType has to be restated or the
      // copy would drop it and the browser would refuse to play the file.
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: key,
          CopySource: `${bucket}/${key}`,
          MetadataDirective: "REPLACE",
          ContentType: head.ContentType ?? "audio/mpeg",
          CacheControl: CACHE_CONTROL,
        })
      );

      const after = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (after.ContentLength !== head.ContentLength) {
        throw new Error(`size changed: ${head.ContentLength} -> ${after.ContentLength}`);
      }
      changed += 1;
      console.log(`set        ${key}`);
    } catch (error) {
      failed.push(key);
      console.error(`FAILED     ${key}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

console.log(
  `\n${seen} objects: ${already} already set, ${changed} ${apply ? "updated" : "would be updated"}, ${failed.length} failed`
);
if (!apply && changed > 0) console.log("Re-run with --apply to write these.");
process.exit(failed.length > 0 ? 1 : 0);
