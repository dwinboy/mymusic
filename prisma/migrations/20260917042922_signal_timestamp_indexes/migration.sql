-- CreateIndex
CREATE INDEX "downloads_createdAt_idx" ON "downloads"("createdAt");

-- CreateIndex
CREATE INDEX "favorites_createdAt_idx" ON "favorites"("createdAt");

-- CreateIndex
CREATE INDEX "playlist_tracks_addedAt_idx" ON "playlist_tracks"("addedAt");

-- CreateIndex
CREATE INDEX "plays_createdAt_idx" ON "plays"("createdAt");

