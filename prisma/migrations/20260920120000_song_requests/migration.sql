-- Commissions: someone asking for a song to be written for them.
-- The brief is columns rather than one free-text box, because a song for a
-- named person fails in specific ways — the wrong name, the wrong pronouns,
-- the one memory they wanted left out — and asking separately is what stops
-- that. Payment is recorded, not processed: there is no checkout yet, so
-- ACCEPTED is set by an admin who confirmed payment arranged off-platform.

-- CreateEnum
CREATE TYPE "SongRequestStatus" AS ENUM ('SUBMITTED', 'QUOTED', 'ACCEPTED', 'IN_PRODUCTION', 'DELIVERED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "song_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occasionTermId" TEXT,
    "occasionNote" TEXT,
    "recipientName" TEXT,
    "relationship" TEXT,
    "pronouns" TEXT,
    "story" TEXT NOT NULL,
    "mustInclude" TEXT,
    "language" TEXT,
    "referenceUrl" TEXT,
    "soundNote" TEXT,
    "neededBy" TIMESTAMP(3),
    "publishConsent" BOOLEAN NOT NULL DEFAULT false,
    "status" "SongRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priceAmount" INTEGER,
    "priceCurrency" TEXT,
    "paymentNote" TEXT,
    "declineReason" TEXT,
    "deliveredTrackId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_request_terms" (
    "requestId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,

    CONSTRAINT "song_request_terms_pkey" PRIMARY KEY ("requestId","termId")
);

-- CreateTable
CREATE TABLE "song_request_messages" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_request_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "song_requests_reference_key" ON "song_requests"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "song_requests_deliveredTrackId_key" ON "song_requests"("deliveredTrackId");

-- CreateIndex
CREATE INDEX "song_requests_status_createdAt_idx" ON "song_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "song_requests_userId_createdAt_idx" ON "song_requests"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "song_requests_neededBy_idx" ON "song_requests"("neededBy");

-- CreateIndex
CREATE INDEX "song_request_terms_termId_idx" ON "song_request_terms"("termId");

-- CreateIndex
CREATE INDEX "song_request_messages_requestId_createdAt_idx" ON "song_request_messages"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_occasionTermId_fkey" FOREIGN KEY ("occasionTermId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_deliveredTrackId_fkey" FOREIGN KEY ("deliveredTrackId") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_request_terms" ADD CONSTRAINT "song_request_terms_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "song_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_request_terms" ADD CONSTRAINT "song_request_terms_termId_fkey" FOREIGN KEY ("termId") REFERENCES "taxonomy_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_request_messages" ADD CONSTRAINT "song_request_messages_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "song_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_request_messages" ADD CONSTRAINT "song_request_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

