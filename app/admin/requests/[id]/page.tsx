import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { RequestStatusChip } from "@/components/requests/request-status-chip";
import { RequestActions } from "@/components/admin/request-actions";
import { AdminRequestThread } from "@/components/admin/request-thread";
import { formatPrice } from "@/lib/song-requests/status";
import type { SongRequestStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Commission" };

/** Mirrors lib/song-requests/status so the panel only offers real moves. */
const ADMIN_TRANSITIONS: Record<SongRequestStatus, SongRequestStatus[]> = {
  SUBMITTED: ["QUOTED", "ACCEPTED", "DECLINED"],
  QUOTED: ["ACCEPTED", "DECLINED", "QUOTED"],
  ACCEPTED: ["IN_PRODUCTION", "DELIVERED", "DECLINED"],
  IN_PRODUCTION: ["DELIVERED", "DECLINED"],
  DELIVERED: ["IN_PRODUCTION"],
  DECLINED: [],
  CANCELLED: [],
};

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) notFound();
  const { id } = await params;

  const request = await db.songRequest.findUnique({
    where: { id },
    include: {
      occasionTerm: { select: { name: true } },
      terms: { select: { term: { select: { id: true, name: true, kind: true } } } },
      user: { select: { id: true, name: true, email: true } },
      deliveredTrack: { select: { id: true, title: true, slug: true, isPublished: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          isInternal: true,
          createdAt: true,
          author: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });
  if (!request) notFound();

  // Candidates to deliver: recent tracks not already promised to another
  // commission. Unpublished ones included — most commissions are.
  const tracks = await db.track.findMany({
    where: { OR: [{ songRequest: null }, { songRequest: { id } }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, artist: { select: { name: true } } },
  });

  const occasion = request.occasionTerm?.name ?? request.occasionNote ?? "A song";

  return (
    <div className="px-4 py-8 sm:px-8">
      <Link href="/admin/requests" className="text-sm text-foreground-muted hover:text-foreground">
        ← Commissions
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {occasion}
            {request.recipientName && <span className="text-foreground-muted"> for {request.recipientName}</span>}
          </h1>
          <p className="mt-1.5 text-sm text-foreground-subtle">
            {request.reference} · {request.user.name ?? "No name"} · {request.user.email}
          </p>
        </div>
        <RequestStatusChip status={request.status} />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <section className="rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">The brief</h2>
            <dl className="mt-4 flex flex-col gap-4">
              <Detail label="The story">{request.story}</Detail>
              {request.mustInclude && <Detail label="Must include">{request.mustInclude}</Detail>}
              {request.relationship && <Detail label="Relationship">{request.relationship}</Detail>}
              {request.pronouns && <Detail label="Referred to as">{request.pronouns}</Detail>}
              {request.terms.length > 0 && (
                <Detail label="Sound">{request.terms.map((t) => `${t.term.name}`).join(", ")}</Detail>
              )}
              {request.language && <Detail label="Language">{request.language}</Detail>}
              {request.referenceUrl && (
                <Detail label="Reference">
                  <a href={request.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    {request.referenceUrl}
                  </a>
                </Detail>
              )}
              {request.neededBy && <Detail label="Needed by">{request.neededBy.toISOString().slice(0, 10)}</Detail>}
              <Detail label="May publish">{request.publishConsent ? "Yes — consented" : "No — keep private"}</Detail>
              {request.priceAmount !== null && request.priceCurrency && (
                <Detail label="Quoted">
                  {formatPrice(request.priceAmount, request.priceCurrency)}
                  {request.quoteAcceptedAt && " · accepted by them"}
                </Detail>
              )}
              {request.paymentNote && <Detail label="Payment">{request.paymentNote}</Detail>}
              {request.deliveredTrack && (
                <Detail label="Delivered">
                  <Link href={`/admin/tracks/${request.deliveredTrack.id}`} className="underline">
                    {request.deliveredTrack.title}
                  </Link>
                  {request.deliveredTrack.isPublished ? " · public" : " · private"}
                </Detail>
              )}
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-foreground">Conversation</h2>
            <p className="mt-1 text-xs text-foreground-muted">
              Replies are emailed to them. Internal notes stay here and are never shown to the requester.
            </p>
            <div className="mt-4">
              <AdminRequestThread requestId={request.id} messages={request.messages} />
            </div>
          </section>
        </div>

        <aside className="min-w-0">
          <RequestActions
            requestId={request.id}
            status={request.status}
            nextStatuses={ADMIN_TRANSITIONS[request.status]}
            currency={request.priceCurrency ?? "XAF"}
            deliveredTrackId={request.deliveredTrack?.id ?? null}
            tracks={tracks.map((t) => ({ id: t.id, title: t.title, artistName: t.artist.name }))}
          />
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground-subtle">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{children}</dd>
    </div>
  );
}
