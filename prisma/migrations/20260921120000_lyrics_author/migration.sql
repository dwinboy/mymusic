-- Who wrote the words, recorded separately from how the music was made.
-- A track composed with AI tools can still have lyrics a person wrote out
-- of their own life, and on this catalogue that is the usual case. One
-- disclosure covering both hid the part listeners care about most.
--
-- Existing rows default to ARTIST, which is what this catalogue is: the
-- words are written, the music is produced with AI. A creator who did
-- generate their lyrics can say so on the track.

-- CreateEnum
CREATE TYPE "LyricsAuthor" AS ENUM ('ARTIST', 'AI', 'INSTRUMENTAL');

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "lyricsAuthor" "LyricsAuthor" NOT NULL DEFAULT 'ARTIST';

