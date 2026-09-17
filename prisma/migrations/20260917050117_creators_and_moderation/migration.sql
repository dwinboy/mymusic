-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "location" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "artists_ownerId_idx" ON "artists"("ownerId");

-- CreateIndex
CREATE INDEX "tracks_moderationStatus_submittedAt_idx" ON "tracks"("moderationStatus", "submittedAt");

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

