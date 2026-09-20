-- The catalogue declared itself AI_GENERATED because that was the column
-- default, not because anyone chose it. The app defines that value as "created
-- by an AI system, with little or no human performance", which understates the
-- work: the lyrics are written by people and the music is produced with AI
-- tools. AI_ASSISTED — "a person created the music with meaningful help from AI
-- tools" — is the accurate label, and the honest one.
ALTER TABLE "tracks" ALTER COLUMN "aiDisclosure" SET DEFAULT 'AI_ASSISTED';

-- One-time correction of the rows that carry the old default. Deliberately
-- scoped to AI_GENERATED: anything an admin or creator set to HUMAN_CREATED, or
-- already to AI_ASSISTED, was a real choice and is left exactly as it is.
UPDATE "tracks" SET "aiDisclosure" = 'AI_ASSISTED' WHERE "aiDisclosure" = 'AI_GENERATED';
