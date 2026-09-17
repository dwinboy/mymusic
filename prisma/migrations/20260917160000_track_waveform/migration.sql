-- Loudness peaks for the waveform seek bar. Additive; filled in during
-- processing for new tracks and on first request for existing ones.
ALTER TABLE "tracks" ADD COLUMN "waveform" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];
