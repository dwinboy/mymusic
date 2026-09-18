-- The category whose bundled photo stands in for a track with no artwork,
-- as "KIND:slug". Denormalized from track_terms so listings don't have to
-- join the taxonomy to render a card.
ALTER TABLE "tracks" ADD COLUMN "artworkCategory" TEXT;
