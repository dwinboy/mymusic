import { z } from "zod";

/**
 * What a brief has to contain to be worth quoting.
 *
 * The story is the only long field that's required: everything else either
 * has a sensible absence (no deadline, no reference track) or is a detail the
 * story usually carries anyway. Making the rest optional keeps the form from
 * feeling like paperwork, which is what stops people finishing it.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const songRequestInput = z.object({
  occasionTermId: z.string().cuid().optional().nullable(),
  occasionNote: trimmed(120).optional().nullable(),

  recipientName: trimmed(120).optional().nullable(),
  relationship: trimmed(120).optional().nullable(),
  pronouns: trimmed(40).optional().nullable(),

  story: z
    .string()
    .trim()
    .min(40, "Tell us a bit more — a few sentences gives us something to write from.")
    .max(4000),
  mustInclude: trimmed(1000).optional().nullable(),

  termIds: z.array(z.string().cuid()).max(8).default([]),
  language: trimmed(60).optional().nullable(),
  referenceUrl: z.union([z.string().trim().url(), z.literal("")]).optional().nullable(),
  soundNote: trimmed(1000).optional().nullable(),

  neededBy: z
    .union([z.string().trim(), z.literal("")])
    .optional()
    .nullable()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "That date doesn't look right."),

  publishConsent: z.boolean().default(false),
});

export type SongRequestInput = z.infer<typeof songRequestInput>;

/** An occasion has to come from somewhere — a term, or their own words. */
export function hasOccasion(input: SongRequestInput): boolean {
  return !!input.occasionTermId || !!input.occasionNote?.trim();
}

export const quoteInput = z.object({
  /** In major units as typed — "15000" or "25.50" — converted on the server. */
  amount: z.number().positive().max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase(),
  note: trimmed(2000).optional().nullable(),
});

export const messageInput = z.object({
  body: z.string().trim().min(1).max(4000),
  isInternal: z.boolean().default(false),
});
