# Deploying to Railway

Lumen is a single Next.js application — there's no separate "backend service" to split out. Its API routes, admin logic, and auth all run *as part of* the Next.js deployment. The whole thing deploys to Railway as two services in one project:

```
web       → the whole Next.js app (UI + API routes + admin + auth)
Postgres  → the database (metadata only — see MEDIA_SETUP.md for why audio/images live elsewhere)
```

`web` reaches Postgres over Railway's **private network** (`postgres.railway.internal`), so the database never needs to be exposed to the public internet — no TCP proxy, no credentials travelling over the open web.

This doc assumes you've already read **[MEDIA_SETUP.md](./MEDIA_SETUP.md)** — R2 and Cloudinary are not optional. The app actively **refuses local-storage uploads whenever `NODE_ENV=production`** (verified directly: Next.js's production server only serves `/public` files that existed at build time, so local uploads would otherwise 404 for every visitor). Skipping that setup doesn't mean "slower," it means the admin upload flow is blocked outright until R2/Cloudinary are configured.

## Why not Vercel?

Vercel would work, but Railway wins on two specifics for this app:

- **No function timeout.** Audio transcoding runs in-process via `ffmpeg-static` (`FfmpegAudioProcessingService`). Vercel's serverless functions cap execution time; a long upload would be killed mid-transcode. Railway containers have no such limit.
- **Private database networking.** On Vercel the database must be publicly reachable (Railway TCP proxy + credentials over the internet). Keeping both services on Railway means the database has no public listener at all.

## 1. Project and database

```bash
railway login
railway init --name lumen
railway add --database postgres
```

That provisions Postgres with an internal-only address. Nothing else to configure on it.

## 2. The app service

```bash
railway add --repo <your-github-user>/mymusic --service web
```

Railway auto-detects Next.js and builds with `npm run build` (`prisma generate` runs automatically via the `postinstall` script, since the generated Prisma client is gitignored on purpose — it contains a platform-specific binary that would break if committed from a dev machine).

**Migrations run at start, not at build.** `railway.json` sets the start command to:

```
npx prisma migrate deploy && npm run start
```

This matters: Railway's private network only resolves at *runtime*, so a build-time `migrate deploy` could not reach `postgres.railway.internal`. `migrate deploy` is idempotent, so re-running it on every container start is safe and costs a second or two.

Relatedly, the build must not require a database at all. The three routes that read the catalogue during render (`/`, `/artists`, `/sitemap.xml`) are marked `export const dynamic = "force-dynamic"` — correct on its own merits, since a statically baked catalogue would never show newly published tracks.

## 3. Environment variables

Set on the **web** service (`railway variable set KEY=VALUE --service web`):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — a Railway reference, resolved at deploy time to the internal address |
| `NEXTAUTH_URL` | your public domain, e.g. `https://web-production-xxxx.up.railway.app` |
| `NEXTAUTH_SECRET` | a random secret — `openssl rand -base64 32` (**different** from your local dev one) |
| `NEXT_PUBLIC_SITE_URL` | same as `NEXTAUTH_URL` |
| `AUDIO_STORAGE_DRIVER` | `r2` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` | from Cloudflare — see MEDIA_SETUP.md §1 |
| `IMAGE_PROVIDER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary — see MEDIA_SETUP.md §2 |

`PORT` is injected by Railway and read by `next start` automatically — don't set it yourself.

## 4. Public domain

```bash
railway domain --service web
```

Generates a `*.up.railway.app` hostname. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to it (auth callbacks and OG/canonical URLs both break if these don't match the domain people actually visit). Attach a custom domain later by passing it as an argument.

## 5. After the first deploy

1. **Promote an admin.** The credentials signup flow creates `USER`-role accounts only; there's no self-serve admin signup (by design). Register on the live site, then:

   ```bash
   railway connect Postgres
   ```

   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```

2. **Verify the media guard is satisfied, not just bypassed.** Log into `/admin`, upload a track. If R2/Cloudinary env vars are missing or wrong you'll get a clear error naming exactly what's unset — that's `lib/media/production-guard.ts` doing its job.
3. **Smoke test** the checklist from MEDIA_SETUP.md §5 against the real production stack once.

## 6. Ongoing deploys

Every push to the branch Railway watches triggers a build, and the start command applies any new migrations before the app comes up. Roll back from the Railway dashboard's deployment history, or `railway down` to remove the most recent deployment.

## What's intentionally *not* here

- **A separate backend service.** This app's "backend" (API routes, admin logic, auth) is architecturally part of the Next.js app itself — Server Components and Route Handlers call Prisma directly. Splitting that into a standalone API service would mean rewriting most of the data layer to go over HTTP instead, for no functional benefit at this scale. If you later add something genuinely long-running (swapping `FfmpegAudioProcessingService` for a queue-backed worker, per the note in that file), *that* worker is a good fit for its own Railway service.
- **A public TCP proxy on Postgres.** Only needed if something outside Railway must reach the database directly. For one-off access from your laptop, `railway connect Postgres` tunnels through the CLI instead.
