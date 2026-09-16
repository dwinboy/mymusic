-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "coverImagePublicId" TEXT;

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "avatarImagePublicId" TEXT,
ADD COLUMN     "coverImagePublicId" TEXT;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "coverImageHeight" INTEGER,
ADD COLUMN     "coverImagePublicId" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "coverImageWidth" INTEGER,
ADD COLUMN     "downloadFormat" TEXT,
ADD COLUMN     "downloadSize" INTEGER,
ADD COLUMN     "downloadStorageKey" TEXT,
ADD COLUMN     "originalFormat" TEXT,
ADD COLUMN     "originalSize" INTEGER,
ADD COLUMN     "originalStorageKey" TEXT,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "streamingFormat" TEXT,
ADD COLUMN     "streamingSize" INTEGER,
ADD COLUMN     "streamingStorageKey" TEXT,
ALTER COLUMN "audioUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "tracks_processingStatus_idx" ON "tracks"("processingStatus");
