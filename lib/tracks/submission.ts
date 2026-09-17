import { db } from "@/lib/db";
import type { Track } from "@/lib/generated/prisma/client";

/**
 * Publication rules for creator uploads.
 *
 * Invariant: moderationStatus === APPROVED means an admin approved the
 * track's *current* title, artwork, audio and AI disclosure. Changing any of
 * those sends it back to review (and off the site if it was live). Without
 * this, approval would be a one-time gate: get something harmless approved,
 * then swap the artwork — or relabel an AI track as human-made. Editing
 * descriptive detail — lyrics, credits, discovery tags — doesn't carry that
 * risk, so it never triggers re-review.
 *
 * Audio isn't listed because creators can't replace it in place: a different
 * recording is a new upload, which goes through review from the start.
 */
export const REVIEWED_FIELDS = ["title", "coverImagePublicId", "coverUrl", "aiDisclosure"] as const;

export interface SubmissionProblem {
  field: string;
  message: string;
}

/**
 * Everything that must be true before a track can go to review (§64). Returns
 * every problem at once so the creator can fix them in one pass.
 */
export async function validateForSubmission(trackId: string): Promise<SubmissionProblem[]> {
  const track = await db.track.findUnique({
    where: { id: trackId },
    include: {
      album: { select: { coverImagePublicId: true, coverUrl: true } },
      terms: { select: { term: { select: { kind: true, isActive: true } } } },
    },
  });
  if (!track) return [{ field: "track", message: "Track not found." }];

  const problems: SubmissionProblem[] = [];
  if (!track.title.trim()) problems.push({ field: "title", message: "Add a title." });

  if (track.processingStatus === "FAILED") {
    problems.push({ field: "audio", message: "Audio processing failed. Retry processing or upload the file again." });
  } else if (track.processingStatus !== "READY") {
    problems.push({ field: "audio", message: "Wait for the audio to finish processing." });
  }

  const hasArtwork = !!(
    track.coverImagePublicId ||
    track.coverUrl ||
    track.album?.coverImagePublicId ||
    track.album?.coverUrl
  );
  if (!hasArtwork) problems.push({ field: "artwork", message: "Add cover artwork." });

  if (!track.terms.some((t) => t.term.kind === "GENRE" && t.term.isActive)) {
    problems.push({ field: "genre", message: "Choose at least one genre." });
  }

  // Accepting the rights confirmation is also where the creator confirms
  // their AI disclosure — the two are one step — so this covers both.
  if (!track.rightsConfirmedAt) {
    problems.push({ field: "rights", message: "Confirm your rights and AI disclosure." });
  }

  return problems;
}

/** Did this edit touch anything an admin approved? */
export function changesReviewedContent(existing: Pick<Track, (typeof REVIEWED_FIELDS)[number]>, data: Record<string, unknown>) {
  return REVIEWED_FIELDS.some((field) => field in data && data[field] !== existing[field]);
}
