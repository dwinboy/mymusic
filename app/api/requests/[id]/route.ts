import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/creator-guard";
import { messageInput } from "@/lib/song-requests/schema";
import { canRequesterCancel } from "@/lib/song-requests/status";

/**
 * One commission, from the requester's side.
 *
 *   GET   -> the brief, its status, the conversation, the delivered song
 *   PATCH -> accept the quote, or cancel
 *   POST  -> add a message
 *
 * Every lookup filters by userId inside the query, so another person's id
 * behaves exactly like one that doesn't exist. Internal notes are excluded at
 * the query, not filtered in the component, so there is no route by which
 * they can reach the page at all.
 */

async function ownedRequest(id: string) {
  const user = await requireUser();
  if (!user) return null;
  const request = await db.songRequest.findFirst({
    where: { id, userId: user.userId },
    select: { id: true, status: true, reference: true, quoteAcceptedAt: true },
  });
  return request ? { request, userId: user.userId } : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const request = await db.songRequest.findFirst({
    where: { id, userId: user.userId },
    select: {
      id: true,
      reference: true,
      status: true,
      occasionNote: true,
      occasionTerm: { select: { name: true, slug: true } },
      recipientName: true,
      relationship: true,
      pronouns: true,
      story: true,
      mustInclude: true,
      language: true,
      referenceUrl: true,
      soundNote: true,
      neededBy: true,
      publishConsent: true,
      priceAmount: true,
      priceCurrency: true,
      declineReason: true,
      quoteAcceptedAt: true,
      deliveredAt: true,
      createdAt: true,
      terms: { select: { term: { select: { id: true, name: true, kind: true, slug: true } } } },
      deliveredTrack: {
        select: { id: true, title: true, slug: true, isPublished: true },
      },
      // Internal notes never leave the admin side.
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedRequest(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "accept") {
    if (owned.request.status !== "QUOTED") {
      return NextResponse.json({ error: "There's no quote to accept." }, { status: 409 });
    }
    // Records the commitment only. The status moves to ACCEPTED when an admin
    // confirms the money arrived — this route can't know that.
    const updated = await db.songRequest.update({
      where: { id },
      data: { quoteAcceptedAt: owned.request.quoteAcceptedAt ?? new Date() },
      select: { id: true, status: true, quoteAcceptedAt: true },
    });
    return NextResponse.json({ request: updated });
  }

  if (action === "cancel") {
    if (!canRequesterCancel(owned.request.status)) {
      return NextResponse.json({ error: "This one is too far along to cancel here — send us a message." }, { status: 409 });
    }
    const updated = await db.songRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      select: { id: true, status: true },
    });
    return NextResponse.json({ request: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedRequest(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = messageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write something first." }, { status: 422 });

  const message = await db.songRequestMessage.create({
    // isInternal is ignored here whatever was sent: this side cannot write a
    // note it wouldn't be allowed to read back.
    data: { requestId: id, authorId: owned.userId, body: parsed.data.body, isInternal: false },
    select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
