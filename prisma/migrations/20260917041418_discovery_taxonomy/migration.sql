-- Discovery taxonomy.
--
-- Ordering matters here and differs from what `prisma migrate diff` generates:
-- the generated script drops `genres`/`track_genres` before creating the new
-- tables, which would discard every existing genre assignment. This version
-- creates the new tables first, copies the data across preserving ids, and
-- only then drops the old ones.

-- CreateEnum
CREATE TYPE "TaxonomyKind" AS ENUM ('GENRE', 'MOOD', 'ACTIVITY', 'OCCASION', 'INSTRUMENT', 'LANGUAGE', 'VOCAL', 'TAG');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('NONE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnergyLevel" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "AiDisclosure" AS ENUM ('AI_GENERATED', 'AI_ASSISTED', 'HUMAN_CREATED');

-- CreateEnum
CREATE TYPE "PlaylistKind" AS ENUM ('USER', 'EDITORIAL', 'ALGORITHMIC');

-- CreateTable
CREATE TABLE "taxonomy_terms" (
    "id" TEXT NOT NULL,
    "kind" "TaxonomyKind" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxonomy_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_terms" (
    "trackId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "track_terms_pkey" PRIMARY KEY ("trackId","termId")
);

-- Backfill: existing genres become GENRE terms, keeping their ids so any
-- external reference still resolves. `updatedAt` has no default, so it is set
-- explicitly.
INSERT INTO "taxonomy_terms" ("id", "kind", "name", "slug", "imageUrl", "createdAt", "updatedAt")
SELECT "id", 'GENRE', "name", "slug", "coverUrl", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "genres";

-- Backfill: existing track/genre assignments. The first genre attached to a
-- track becomes its primary; ordering by genreId is arbitrary but stable, and
-- creators can correct it from the publishing flow.
INSERT INTO "track_terms" ("trackId", "termId", "isPrimary")
SELECT tg."trackId",
       tg."genreId",
       tg."genreId" = (
         SELECT MIN(inner_tg."genreId")
         FROM "track_genres" inner_tg
         WHERE inner_tg."trackId" = tg."trackId"
       )
FROM "track_genres" tg;

-- DropForeignKey
ALTER TABLE "track_genres" DROP CONSTRAINT "track_genres_genreId_fkey";

-- DropForeignKey
ALTER TABLE "track_genres" DROP CONSTRAINT "track_genres_trackId_fkey";

-- DropTable
DROP TABLE "track_genres";

-- DropTable
DROP TABLE "genres";

-- AlterTable
ALTER TABLE "playlists" ADD COLUMN     "coverImagePublicId" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "PlaylistKind" NOT NULL DEFAULT 'USER',
ADD COLUMN     "rules" JSONB;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "aiDetails" TEXT,
ADD COLUMN     "aiDisclosure" "AiDisclosure" NOT NULL DEFAULT 'AI_GENERATED',
ADD COLUMN     "aiTool" TEXT,
ADD COLUMN     "energy" "EnergyLevel",
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "rightsConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "rightsConfirmedBy" TEXT,
ADD COLUMN     "tempoBpm" INTEGER;

-- Existing rows carry isAiGenerated; keep aiDisclosure consistent with it
-- rather than defaulting human-made tracks to AI_GENERATED.
UPDATE "tracks" SET "aiDisclosure" = 'HUMAN_CREATED' WHERE "isAiGenerated" = false;

-- CreateIndex
CREATE INDEX "taxonomy_terms_kind_isActive_displayOrder_idx" ON "taxonomy_terms"("kind", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "taxonomy_terms_kind_isFeatured_idx" ON "taxonomy_terms"("kind", "isFeatured");

-- CreateIndex
CREATE INDEX "taxonomy_terms_parentId_idx" ON "taxonomy_terms"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_terms_kind_slug_key" ON "taxonomy_terms"("kind", "slug");

-- CreateIndex
CREATE INDEX "track_terms_termId_idx" ON "track_terms"("termId");

-- CreateIndex
CREATE INDEX "track_terms_trackId_idx" ON "track_terms"("trackId");

-- CreateIndex
CREATE INDEX "playlists_kind_isPublic_idx" ON "playlists"("kind", "isPublic");

-- CreateIndex
CREATE INDEX "playlists_kind_isFeatured_idx" ON "playlists"("kind", "isFeatured");

-- AddForeignKey
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_terms" ADD CONSTRAINT "track_terms_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_terms" ADD CONSTRAINT "track_terms_termId_fkey" FOREIGN KEY ("termId") REFERENCES "taxonomy_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
