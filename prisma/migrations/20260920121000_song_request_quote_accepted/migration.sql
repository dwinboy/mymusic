-- When the requester agreed to the quote, which with payment arranged
-- off-platform is a different event from the money arriving. ACCEPTED still
-- means paid; this records the commitment that comes before it.

-- AlterTable
ALTER TABLE "song_requests" ADD COLUMN     "quoteAcceptedAt" TIMESTAMP(3);

