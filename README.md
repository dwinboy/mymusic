# Vibe Banger

A premium, mobile-first AI music streaming PWA — built with Next.js (App Router), TypeScript, Tailwind CSS v4, Prisma/PostgreSQL, and NextAuth.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth v5 (credentials provider, JWT sessions)
- **State:** Zustand (global audio player store)
- **Media:** local disk in dev (`/public/uploads`) — Cloudflare R2 (audio) + Cloudinary (artwork) in production, see [MEDIA_SETUP.md](./MEDIA_SETUP.md)
- **Styling:** Tailwind CSS v4 + Radix UI primitives
- **PWA:** installable, with a service worker for explicit per-track offline downloads (not full-catalogue caching)

## Local setup

1. **Database.** Point `DATABASE_URL` in `.env` at a running Postgres instance. Locally this project was built against Homebrew Postgres:

   ```bash
   createdb -O <role> vibebanger_dev
   ```

2. **Env vars.** Copy `.env.example` to `.env` and fill in `NEXTAUTH_SECRET` (any random string — `openssl rand -base64 32`).

3. **Install & migrate:**

   ```bash
   npm install
   npx prisma migrate dev
   ```

4. **Seed demo data** (optional, but recommended for a populated catalogue on first run — generates real short placeholder audio via ffmpeg and gradient artwork via sharp, and creates an admin + demo user):

   ```bash
   npm run db:seed
   ```

   - Admin login: `admin@vibebanger.app` / `vibebanger-admin-2026`
   - Demo user: `demo@vibebanger.app` / `vibebanger-demo-2026`

   Delete the seed data any time via `/admin/tracks` (or wipe and re-run the seed) once you're uploading real music.

5. **Run:**

   ```bash
   npm run dev
   ```

## Publishing your own music

Admin CMS lives under `/admin` (requires an `ADMIN`-role user — promote one via Prisma Studio: `npx prisma studio`, or seed one). Upload flow: `/admin/tracks/new` → audio + artwork + metadata → publish. Artists and genres are managed separately under `/admin/artists` and `/admin/genres`; create those first, then reference them from the track form.

## Media storage

By default (`AUDIO_STORAGE_DRIVER=local`, `IMAGE_PROVIDER=local`, both unset), audio and artwork write to `/public/uploads` — nothing to configure, zero external accounts needed for local dev.

For production, audio moves to **Cloudflare R2** (new tracks upload directly from the browser to R2 — never through the app server — then get transcoded server-side into a streaming and a download copy) and artwork moves to **Cloudinary** (responsive, transformed delivery). Both are opt-in via environment variables with no code changes either way. Full setup instructions, including how to test the R2 path locally against a MinIO server with no real Cloudflare account: **[MEDIA_SETUP.md](./MEDIA_SETUP.md)**.

Already-uploaded local media migrates safely with `npm run migrate:media` (uploads, verifies, then repoints the database — never deletes your local copies).

Production deployments actively refuse local-storage uploads (verified directly: Next.js's production server only serves `/public` files present at build time, so a new admin upload would otherwise silently 404 for every visitor) — R2/Cloudinary aren't optional once `NODE_ENV=production`.

## Deployment

**[DEPLOYMENT.md](./DEPLOYMENT.md)** — Railway, as two services in one project: the whole Next.js app plus a Postgres database it reaches over Railway's private network. There's no separate backend service to split out, since API routes and admin logic are part of the same Next.js app that talks to Postgres directly.

## What's built vs. what's next

Deeply implemented: design system, auth, catalogue data model, admin upload/CRUD (direct-to-R2 uploads, async FFmpeg processing, a processing-status pipeline with retry, and matching Cloudinary upload UI for track/artist/album artwork), all public browsing pages, the global audio engine (persists across navigation, Media Session integration for lock-screen/background controls, HTTP Range-request seeking against R2), the desktop/mobile player UI, likes, playlists, sharing, SEO (sitemap, JSON-LD, OG metadata), a swappable accent color (Admin → Settings), real per-track offline downloads (IndexedDB + Cache Storage + a service worker, not a browser file-save), an admin storage dashboard + media health check, and a production guard that blocks (rather than silently breaks) local-storage uploads once deployed.

Intentionally lighter for now, as a natural next iteration: a proper analytics event pipeline with play-count thresholds.
