import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/creator-guard";
import { songRequestInput, hasOccasion } from "@/lib/song-requests/schema";
import { generateReference } from "@/lib/song-requests/reference";
import { emailRequestReceived, emailAdminNewRequest } from "@/lib/song-requests/notify";

/** How many live requests one account may have open at once. */
const MAX_OPEN_PER_USER = 5;

/**
 * Commissions.
 *
 *   GET  -> the signed-in person's own requests
 *   POST -> a new brief
 *
 * An account is required. Without email verification or a payment step there
 * is nothing else tying a brief to a person, and the requester needs somewhere
 * to come back to for the finished song.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const requests = await db.songRequest.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      occasionNote: true,
      occasionTerm: { select: { name: true } },
      recipientName: true,
      neededBy: true,
      createdAt: true,
      priceAmount: true,
      priceCurrency: true,
      deliveredTrack: { select: { title: true, slug: true } },
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = songRequestInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Some of this needs another look.", problems: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
      { status: 422 }
    );
  }
  const input = parsed.data;

  if (!hasOccasion(input)) {
    return NextResponse.json(
      { error: "Some of this needs another look.", problems: [{ field: "occasion", message: "Tell us what the song is for." }] },
      { status: 422 }
    );
  }

  // Not a rate limit so much as a fairness one: five open briefs is more than
  // anyone genuinely needs at once, and it stops one account filling the queue.
  const open = await db.songRequest.count({
    where: { userId: user.userId, status: { in: ["SUBMITTED", "QUOTED", "ACCEPTED", "IN_PRODUCTION"] } },
  });
  if (open >= MAX_OPEN_PER_USER) {
    return NextResponse.json(
      { error: `You already have ${open} requests on the go. Let's finish those first.` },
      { status: 429 }
    );
  }

  // Only real, active terms, and only kinds that describe a sound or an
  // occasion — a request carrying an arbitrary term id would show up in
  // taxonomy listings it has no business in.
  const termIds = input.termIds.length
    ? (
        await db.taxonomyTerm.findMany({
          where: { id: { in: input.termIds }, isActive: true, kind: { in: ["GENRE", "MOOD", "OCCASION", "LANGUAGE"] } },
          select: { id: true },
        })
      ).map((t) => t.id)
    : [];

  const created = await createWithReference((reference) =>
    db.songRequest.create({
      data: {
        reference,
        userId: user.userId,
        occasionTermId: input.occasionTermId || null,
        occasionNote: input.occasionNote || null,
        recipientName: input.recipientName || null,
        relationship: input.relationship || null,
        pronouns: input.pronouns || null,
        story: input.story,
        mustInclude: input.mustInclude || null,
        language: input.language || null,
        referenceUrl: input.referenceUrl || null,
        soundNote: input.soundNote || null,
        neededBy: input.neededBy ? new Date(input.neededBy) : null,
        publishConsent: input.publishConsent,
        terms: { create: termIds.map((termId) => ({ termId })) },
      },
      select: {
        id: true,
        reference: true,
        status: true,
        neededBy: true,
        recipientName: true,
        occasionNote: true,
        occasionTerm: { select: { name: true } },
        user: { select: { email: true, name: true } },
      },
    })
  );

  // The brief is saved; mail is a courtesy on top and must not fail the call.
  const occasion = created.occasionTerm?.name || created.occasionNote || "Something else";
  await Promise.all([
    emailRequestReceived(created.user, created),
    emailAdminNewRequest({ ...created, occasion }),
  ]);

  return NextResponse.json({ request: { id: created.id, reference: created.reference, status: created.status } }, { status: 201 });
}

/**
 * References are short enough to collide, and a collision is a unique-
 * constraint error rather than anything the caller did wrong, so retry with a
 * fresh code instead of failing the submission.
 */
async function createWithReference<T>(create: (reference: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await create(generateReference());
    } catch (error) {
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        String(error.meta?.target ?? "").includes("reference");
      if (!collision) throw error;
    }
  }
  throw new Error("Couldn't allocate a request reference.");
}
