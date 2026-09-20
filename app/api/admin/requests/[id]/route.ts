import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { quoteInput, messageInput } from "@/lib/song-requests/schema";
import { canAdminMove, priceToMinorUnits } from "@/lib/song-requests/status";
import {
  emailQuoteSent,
  emailInProduction,
  emailDelivered,
  emailDeclined,
} from "@/lib/song-requests/notify";
import type { SongRequestStatus } from "@/lib/generated/prisma/client";

/**
 * Working a commission.
 *
 *   GET   -> everything, internal notes included
 *   PATCH -> quote, move status, record payment, attach the finished song
 *   POST  -> reply, or leave an internal note
 *
 * Status changes go through canAdminMove rather than trusting the body, so a
 * declined request can't be walked back into production by a stale tab.
 */

const REQUEST_DETAIL = {
  id: true,
  reference: true,
  status: true,
  occasionNote: true,
  occasionTerm: { select: { id: true, name: true, slug: true } },
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
  paymentNote: true,
  declineReason: true,
  quoteAcceptedAt: true,
  deliveredAt: true,
  createdAt: true,
  terms: { select: { term: { select: { id: true, name: true, kind: true, slug: true } } } },
  user: { select: { id: true, name: true, email: true } },
  deliveredTrack: { select: { id: true, title: true, slug: true, isPublished: true } },
  messages: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      body: true,
      isInternal: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const request = await db.songRequest.findUnique({ where: { id }, select: REQUEST_DETAIL });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const existing = await db.songRequest.findUnique({
    where: { id },
    select: { id: true, reference: true, status: true, user: { select: { email: true, name: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  // --- Send a quote -------------------------------------------------------
  if (action === "quote") {
    const parsed = quoteInput.safeParse(body.quote);
    if (!parsed.success) return NextResponse.json({ error: "That price doesn't look right." }, { status: 422 });
    if (!canAdminMove(existing.status, "QUOTED")) {
      return NextResponse.json({ error: `Can't quote a request that is ${existing.status}.` }, { status: 409 });
    }

    const amount = priceToMinorUnits(parsed.data.amount, parsed.data.currency);
    const updated = await db.songRequest.update({
      where: { id },
      data: {
        status: "QUOTED",
        priceAmount: amount,
        priceCurrency: parsed.data.currency,
        // A re-quote is a fresh offer; the old acceptance doesn't carry over.
        quoteAcceptedAt: null,
        ...(parsed.data.note ? { messages: { create: { authorId: session.user.id, body: parsed.data.note } } } : {}),
      },
      select: REQUEST_DETAIL,
    });

    await emailQuoteSent(existing.user, existing, { amount, currency: parsed.data.currency }, parsed.data.note);
    return NextResponse.json({ request: updated });
  }

  // --- Move status --------------------------------------------------------
  if (action === "status") {
    const next = body?.status as SongRequestStatus | undefined;
    if (!next || !canAdminMove(existing.status, next)) {
      return NextResponse.json({ error: `Can't move a request from ${existing.status} to ${next}.` }, { status: 409 });
    }

    const updated = await db.songRequest.update({
      where: { id },
      data: {
        status: next,
        ...(next === "ACCEPTED" && typeof body.paymentNote === "string"
          ? { paymentNote: body.paymentNote.trim() || null }
          : {}),
        ...(next === "DECLINED" && typeof body.declineReason === "string"
          ? { declineReason: body.declineReason.trim() || null }
          : {}),
      },
      select: REQUEST_DETAIL,
    });

    if (next === "IN_PRODUCTION") await emailInProduction(existing.user, existing);
    if (next === "DECLINED") await emailDeclined(existing.user, existing, updated.declineReason);
    return NextResponse.json({ request: updated });
  }

  // --- Attach the finished song, and deliver ------------------------------
  if (action === "deliver") {
    const trackId = typeof body?.trackId === "string" ? body.trackId : null;
    if (!trackId) return NextResponse.json({ error: "Pick the finished track." }, { status: 422 });
    if (!canAdminMove(existing.status, "DELIVERED")) {
      return NextResponse.json({ error: `Can't deliver a request that is ${existing.status}.` }, { status: 409 });
    }

    const track = await db.track.findUnique({ where: { id: trackId }, select: { id: true, title: true, isPublished: true } });
    if (!track) return NextResponse.json({ error: "That track doesn't exist." }, { status: 422 });

    // The brief promised the song stays private unless they said otherwise,
    // and a published track is already in the public catalogue. Refusing is
    // the only option that keeps that promise: by the time anyone noticed, a
    // song written for one named person would have been public for as long as
    // it took to notice.
    const consent = await db.songRequest.findUnique({ where: { id }, select: { publishConsent: true } });
    if (track.isPublished && !consent?.publishConsent) {
      return NextResponse.json(
        { error: "That track is public, and this request didn't agree to publishing. Unpublish it first, or ask them." },
        { status: 409 }
      );
    }

    // One song per commission, and one commission per song: the unique
    // constraint would reject this anyway, but saying so is kinder than a
    // database error.
    const taken = await db.songRequest.findUnique({ where: { deliveredTrackId: trackId }, select: { id: true, reference: true } });
    if (taken && taken.id !== id) {
      return NextResponse.json({ error: `That track is already delivered against ${taken.reference}.` }, { status: 409 });
    }

    const updated = await db.songRequest.update({
      where: { id },
      data: { status: "DELIVERED", deliveredTrackId: trackId, deliveredAt: new Date() },
      select: REQUEST_DETAIL,
    });

    await emailDelivered(existing.user, existing, track);
    return NextResponse.json({ request: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const parsed = messageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write something first." }, { status: 422 });

  const exists = await db.songRequest.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await db.songRequestMessage.create({
    data: { requestId: id, authorId: session.user.id, body: parsed.data.body, isInternal: parsed.data.isInternal },
    select: {
      id: true,
      body: true,
      isInternal: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
