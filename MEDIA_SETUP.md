# Media architecture: R2 + Cloudinary setup

Lumen's media layer is provider-agnostic by design: **local disk** (zero setup, the dev default) or **Cloudflare R2 + Cloudinary** (production), switched entirely by environment variables — no code changes either way. This doc covers turning on the production path.

```
PostgreSQL   → metadata only (never audio/image binaries)
Cloudflare R2 → audio (originals, streaming copies, download copies)
Cloudinary    → artwork (covers, avatars), responsive/transformed on delivery
Vercel        → UI, API, auth, business logic — never the transport for big files
```

> **Local storage is not just "slower at scale" — it's non-functional in any real deployment, verified directly.** Next.js's production server (`next start`, and equally any serverless host) only serves `/public` files that existed at build time. A file an admin uploads afterward writes to disk successfully but 404s for every visitor until the next deploy — confirmed by adding a file while `next start` was running (404) and again after a restart (200; same file, unchanged). Because a silent 404 for every future listener is a much worse failure mode than a loud one, the app refuses local-storage uploads outright when `NODE_ENV=production` and R2/Cloudinary aren't configured — you'll get a clear error pointing at this doc instead. This makes step 1/2 below mandatory before deploying, not optional tuning.

## 1. Cloudflare R2 (audio)

1. **Create a bucket.** Cloudflare dashboard → R2 → Create bucket (e.g. `lumen-media`).
2. **Create an API token.** R2 → Manage API Tokens → Create API Token, with read/write access scoped to that bucket. Note the Access Key ID and Secret Access Key — the secret is shown once.
3. **Get your Account ID.** Cloudflare dashboard → R2 → Overview (right sidebar).
4. **Expose the bucket publicly.** Either:
   - **Custom domain (recommended for production):** bucket → Settings → Custom Domains → connect a domain/subdomain you control (e.g. `media.yoursite.com`). Use that as `R2_PUBLIC_BASE_URL`.
   - **r2.dev subdomain (fine for testing):** bucket → Settings → Public Access → enable the `r2.dev` subdomain, use it as `R2_PUBLIC_BASE_URL`.

   Streaming and download files are meant to be public (that's the point — direct CDN delivery, no server in the loop). Original masters are *not* served from this public URL; admins reach them only through a short-lived signed URL generated on demand (`getOriginalUrl`), so nothing extra to configure there.

5. **Set the environment variables:**

   ```bash
   AUDIO_STORAGE_DRIVER="r2"
   R2_ACCOUNT_ID="..."
   R2_ACCESS_KEY_ID="..."
   R2_SECRET_ACCESS_KEY="..."
   R2_BUCKET_NAME="lumen-media"
   R2_PUBLIC_BASE_URL="https://media.yoursite.com"   # or the r2.dev URL
   ```

   `R2_ENDPOINT` is optional — it's derived from `R2_ACCOUNT_ID` as `https://<account_id>.r2.cloudflarestorage.com` when left blank. Set it explicitly only if you're pointing at a different S3-compatible endpoint (e.g. a local MinIO server for testing — see below).

### Local testing without a real R2 account

The whole R2 code path (presigned uploads, FFmpeg processing, Range-request streaming, delete cleanup) was built and verified against a local [MinIO](https://min.io) server, since MinIO speaks the same S3 API R2 does. To do the same:

```bash
brew install minio minio-mc
minio server --address :9000 --console-address :9001 ./minio-data &
mc alias set local http://localhost:9000 <root-user> <root-password>
mc mb local/lumen-media
mc anonymous set download local/lumen-media   # public read, like an R2 public bucket
```

Then:

```bash
AUDIO_STORAGE_DRIVER="r2"
R2_ACCESS_KEY_ID="<root-user>"
R2_SECRET_ACCESS_KEY="<root-password>"
R2_BUCKET_NAME="lumen-media"
R2_ENDPOINT="http://localhost:9000"
R2_PUBLIC_BASE_URL="http://localhost:9000/lumen-media"
```

## 2. Cloudinary (artwork)

1. Create a free account at [cloudinary.com](https://cloudinary.com) — the dashboard shows your Cloud Name, API Key, and API Secret immediately.
2. Set the environment variables:

   ```bash
   IMAGE_PROVIDER="cloudinary"
   CLOUDINARY_CLOUD_NAME="..."
   CLOUDINARY_API_KEY="..."
   CLOUDINARY_API_SECRET="..."
   ```

No upload preset or bucket setup needed — uploads are signed server-side per request (`/api/admin/uploads/image`) and posted directly from the browser to Cloudinary, so `CLOUDINARY_API_SECRET` never reaches the client.

## 3. Environment variable reference

| Variable | Where | Notes |
|---|---|---|
| `R2_ACCOUNT_ID` | server only | |
| `R2_ACCESS_KEY_ID` | server only | |
| `R2_SECRET_ACCESS_KEY` | server only | **never** expose to the browser |
| `R2_BUCKET_NAME` | server only | |
| `R2_ENDPOINT` | server only | optional, derived from account ID |
| `R2_PUBLIC_BASE_URL` | server only | used to build public URLs server-side; not itself secret, but there's no reason to ship it to the client |
| `CLOUDINARY_CLOUD_NAME` | server only | not secret, but only read server-side today |
| `CLOUDINARY_API_KEY` | server only | |
| `CLOUDINARY_API_SECRET` | server only | **never** expose to the browser — used only to sign upload requests |
| `AUDIO_STORAGE_DRIVER` | server only | `"local"` (default) or `"r2"` |
| `IMAGE_PROVIDER` | server only | `"local"` (default) or `"cloudinary"` |

None of these need a `NEXT_PUBLIC_` prefix — every upload is authorized server-side (a presigned R2 URL or a signed Cloudinary request) and handed to the browser just-in-time, so no credential needs to live in client-side JS.

## 4. Migrating existing local media

If tracks/artwork already exist under `STORAGE_DRIVER=local` (`/public/uploads`), set the env vars above for whichever provider(s) you're moving to, then run:

```bash
npm run migrate:media              # both audio and images
npm run migrate:media -- --dry-run # preview only, no changes
npm run migrate:media -- --audio-only
npm run migrate:media -- --images-only
```

The script is safe to re-run and safe to interrupt: it uploads to R2/Cloudinary, **verifies** the upload (a real HEAD request against R2, checked against the source size) and only *then* updates the database pointer. Local files under `/public/uploads` are never deleted by the script — delete them yourself once you've confirmed playback/artwork in the app.

## 5. Verifying it worked

1. `npm run build && npm run start`.
2. Log into `/admin` and upload a track. Watch Network tab: you should see a `PUT` request go straight to your R2 endpoint (not through `localhost:3000`/your app domain) for the audio bytes, and a `POST .../process` afterward.
3. Publish it, open its song page, and press play — audio should stream from your R2 public URL. Try seeking; that exercises R2's Range-request support.
4. Check `/admin/storage` — it should show the track counted in "Streaming audio" storage and the "Audio storage driver" badge reading R2.
5. Delete the track from `/admin/tracks` and confirm (via the R2 dashboard, or `mc ls` against MinIO) that its objects are gone.

## 6. What stays local no matter what

- The Postgres database (metadata only, always).
- The demo/seed catalogue (`npm run db:seed`) always writes through the local driver — it's explicitly disposable, delete-and-replace test data, not something to migrate.
- The PWA's offline-download cache (IndexedDB + Cache Storage, per-device, user-initiated) is unrelated to server-side storage — it caches whatever URL the player streams from, R2 or local, transparently.
