-- When a track was featured, so the homepage hero follows the most recent
-- editorial choice rather than an unrelated release date.
ALTER TABLE "tracks" ADD COLUMN "featuredAt" TIMESTAMP(3);

-- Tracks already featured keep the order they had, so deploying this doesn't
-- silently change what the homepage shows.
UPDATE "tracks" SET "featuredAt" = COALESCE("releaseDate", "createdAt") WHERE "isFeatured" = true;
