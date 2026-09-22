-- One row per completed install, wherever it happened. Platform is
-- constrained to a small set client-side so it always groups cleanly on
-- the analytics page; userId is nullable because installing needs no
-- account.

-- CreateTable
CREATE TABLE "pwa_installs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "platform" TEXT NOT NULL,

    CONSTRAINT "pwa_installs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pwa_installs_createdAt_idx" ON "pwa_installs"("createdAt");

-- AddForeignKey
ALTER TABLE "pwa_installs" ADD CONSTRAINT "pwa_installs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
