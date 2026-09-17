import type { ModerationStatus, ProcessingStatus } from "@/lib/generated/prisma/client";

export type CreatorTrackStatus = "live" | "review" | "changes" | "processing" | "failed" | "draft" | "unpublished";

/**
 * One status per track, as a creator thinks about it, derived from the
 * processing, moderation and publication fields. Order matters: a track whose
 * audio failed is "failed" whatever its moderation state, because that's the
 * thing to fix first.
 */
export function creatorTrackStatus(track: {
  isPublished: boolean;
  processingStatus: ProcessingStatus;
  moderationStatus: ModerationStatus;
}): CreatorTrackStatus {
  if (track.processingStatus === "FAILED") return "failed";
  if (track.processingStatus !== "READY") return "processing";
  if (track.isPublished) return "live";
  if (track.moderationStatus === "PENDING_REVIEW") return "review";
  if (track.moderationStatus === "REJECTED") return "changes";
  if (track.moderationStatus === "APPROVED") return "unpublished";
  return "draft";
}

export const STATUS_META: Record<CreatorTrackStatus, { label: string; variant: "success" | "accent" | "danger" | "default" | "outline" }> = {
  live: { label: "Live", variant: "success" },
  review: { label: "In review", variant: "default" },
  changes: { label: "Changes requested", variant: "danger" },
  processing: { label: "Processing", variant: "outline" },
  failed: { label: "Failed", variant: "danger" },
  draft: { label: "Draft", variant: "outline" },
  unpublished: { label: "Hidden", variant: "outline" },
};
