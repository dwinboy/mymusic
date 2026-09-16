# Deploying: Vercel (app) + Railway (Postgres)

Lumen is a single Next.js application — there's no separate "backend service" to split out. Its API routes, admin logic, and auth all run *as part of* the Next.js deployment, which is exactly what Vercel is built to host. The natural division of labor is:

```
Vercel   → the whole Next.js app (UI + API routes + admin + auth)
Railway  → PostgreSQL (metadata only — see MEDIA_SETUP.md for why audio/images live elsewhere)
```

There's no CORS or cross-service networking to configure: Prisma talks to Postgres over a direct database connection from *inside* your Vercel serverless functions (server-side only, never from the browser), not over HTTP.

This doc assumes you've already read **[MEDIA_SETUP.md](./MEDIA_SETUP.md)** — R2 and Cloudinary are not optional for this deployment. The app actively **refuses local-storage uploads whenever `NODE_ENV=production`** (verified directly: Next.js's production server only serves `/public` files that existed at build time, so local uploads would otherwise 404 for every visitor). Skipping that setup doesn't mean "slower," it means the admin upload flow is blocked outright until R2/Cloudinary are configured — do that first.

## 1. Railway: PostgreSQL

1. [railway.app](https://railway.app) → New Project → **Provision PostgreSQL** (you're only using Railway for the database — no repo/service deploy needed here).
2. Open the Postgres service → **Connect** tab → copy the connection string. Railway gives you two variants:
   - An **internal** URL (`*.railway.internal`) — only reachable from other services *on Railway's private network*. Vercel is not on that network, so **don't use this one**.
   - A **public/proxy** URL (`postgresql://postgres:...@containers-us-west-XXX.railway.app:PORT/railway` or similar) — reachable from anywhere, including Vercel. **Use this one** as `DATABASE_URL`.
3. **Connection pooling.** Vercel serverless functions can scale to many concurrent instances, each holding its own Postgres connections; Railway's Postgres has a finite connection limit. Append a connection-limit hint to the URL so each function instance stays modest:

   ```
   postgresql://postgres:PASSWORD@HOST:PORT/railway?connection_limit=5&pool_timeout=20
   ```

   This is enough for this app's traffic scale without standing up a separate PgBouncer service. If you later see `too many connections` errors under real load, that's the point to add a pooler (Railway supports deploying PgBouncer as an add-on service) — Prisma's schema is already structured so that's a config change, not a code change.

4. Apply the schema. From your local machine (with the Railway `DATABASE_URL` temporarily in `.env`, or exported in your shell):

   ```bash
   npx prisma migrate deploy
   ```

   This applies all committed migrations (`prisma/migrations/`) — it's the production-safe counterpart to `migrate dev` and does nothing if the schema's already up to date, so it's safe to re-run.

## 2. Vercel: the app

1. Import the GitHub repo into Vercel — it auto-detects Next.js, no config needed for the framework itself.
2. **Build command.** The default `next build` works, but won't apply new migrations on future deploys. Recommended: in Project Settings → Build & Development → override the Build Command to:

   ```bash
   npm run vercel-build
   ```

   (defined in `package.json` as `prisma migrate deploy && next build`) — so every deploy applies pending migrations before building. `prisma generate` itself runs automatically via the `postinstall` script regardless of which build command you pick, since the generated Prisma client is gitignored on purpose (it contains a platform-specific binary — committing one built on your laptop would break on Vercel's Linux servers).

3. **Environment variables** (Project Settings → Environment Variables — set for both *Production* and *Preview* environments, since the local-storage guard above applies to Preview deployments too):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Railway public connection string from step 1 |
   | `NEXTAUTH_URL` | `https://your-domain.vercel.app` (your production domain) |
   | `NEXTAUTH_SECRET` | a random secret — `openssl rand -base64 32` (**different** from your local dev one) |
   | `NEXT_PUBLIC_SITE_URL` | same as `NEXTAUTH_URL` |
   | `AUDIO_STORAGE_DRIVER` | `r2` |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` | from Cloudflare — see MEDIA_SETUP.md §1 |
   | `IMAGE_PROVIDER` | `cloudinary` |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary — see MEDIA_SETUP.md §2 |

   None of these need a Railway-side counterpart — Railway only hosts the database, so it only ever needs `DATABASE_URL` to exist (which you already used locally in step 1.4).

4. Deploy. First deploy will run `prisma migrate deploy` (if you used `vercel-build`) against the Railway database, then build and ship the app.

## 3. After the first deploy

1. **Promote an admin.** The credentials-based signup flow creates `USER`-role accounts only; there's no self-serve admin signup (by design). Create your account via `/register` on the live site, then promote it directly in Railway's Postgres — easiest via `npx prisma studio` pointed at the Railway `DATABASE_URL`, or:

   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```

2. **Verify the media guard is satisfied, not just bypassed.** Log into `/admin`, upload a track. If R2/Cloudinary env vars are missing or wrong, you'll get a clear error naming exactly what's unset (not a silent failure) — that's `lib/media/production-guard.ts` doing its job.
3. **Smoke test the checklist** from MEDIA_SETUP.md §5 (direct-to-R2 upload, playback, seeking, deletion cleanup) against the real production stack once.

## 4. Ongoing deploys

Every `git push` to the branch Vercel watches triggers a new deploy. With `vercel-build` configured, that also re-applies any new Prisma migrations against Railway automatically. If you'd rather review migrations before they hit production, drop `prisma migrate deploy` from the build command and run it manually (same command as step 1.4) right before or after each deploy instead.

## What's intentionally *not* here

- **A separate backend service on Railway.** This app's "backend" (API routes, admin logic, auth) is architecturally part of the Next.js app itself — Server Components and Route Handlers call Prisma directly. Splitting that into a standalone API service would mean rewriting most of the data layer to go over HTTP instead, for no functional benefit at this scale. If you later add something genuinely long-running (e.g. swapping `FfmpegAudioProcessingService` for a queue-backed worker, per the note in that file), *that* worker is a good fit for a Railway service — the database is not.
- **Railway app hosting / `railway.json`.** Not needed — you're using Railway purely as a managed Postgres provider, provisioned through their dashboard, not deploying this repo to Railway.
