-- Following creators and saving albums. Additive: both are new tables.
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_albums" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_albums_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "follows_userId_artistId_key" ON "follows"("userId", "artistId");
CREATE INDEX "follows_artistId_createdAt_idx" ON "follows"("artistId", "createdAt");
CREATE INDEX "follows_userId_createdAt_idx" ON "follows"("userId", "createdAt");
CREATE UNIQUE INDEX "saved_albums_userId_albumId_key" ON "saved_albums"("userId", "albumId");
CREATE INDEX "saved_albums_userId_createdAt_idx" ON "saved_albums"("userId", "createdAt");

ALTER TABLE "follows" ADD CONSTRAINT "follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_albums" ADD CONSTRAINT "saved_albums_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_albums" ADD CONSTRAINT "saved_albums_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
