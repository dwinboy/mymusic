-- Integrated loudness (LUFS) measured when the track is transcoded, so the
-- player can even out volume across the catalogue. Null means "not measured" —
-- those tracks play at their mastered level.
ALTER TABLE "tracks" ADD COLUMN "loudnessLufs" DOUBLE PRECISION;
