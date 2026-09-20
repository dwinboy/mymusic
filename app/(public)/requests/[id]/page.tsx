import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, Quote } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { PlayButton } from "@/components/player/play-button";
import { TrackArt } from "@/components/player/track-art";
import { DownloadButton } from "@/components/music/download-button";
import { RequestStatusChip } from "@/components/requests/request-status-chip";
import { RequestConversation } from "@/components/requests/request-conversation";
import { QuoteActions } from "@/components/requests/quote-actions";
import { REQUEST_STATUS_BLURB, formatPrice, canRequesterCancel } from "@/lib/song-requests/status";

export const metadata: Metadata = { title: "Your request" };

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) redirect(`/login?callbackUrl=/requests/${id}`);

  const { new: isNew } = await searchParams;

  // Filtered by userId in the query: someone else's id behaves exactly like
  // one that doesn't exist.
  const request = await db.songRequest.findFirst({
    where: { id, userId: session.user.id },
    include: {
      occasionTerm: { select: { name: true } },
      terms: { select: { term: { select: { id: true, name: true } } } },
      deliveredTrack: { include: { artist: true, album: true } },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!request) notFound();

  const occasion = request.occasionTerm?.name ?? request.occasionNote ?? "A song";
  const song = request.deliveredTrack ? toPlayerTrack(request.deliveredTrack) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/requests" className="text-sm text-foreground-muted hover:text-foreground">
        ← Your requests
      </Link>

      {isNew && (
        <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="text-sm font-medium text-foreground">Your brief is with us.</p>
          <p className="mt-1 text-sm text-foreground-muted">
            We&apos;ll read it properly and come back with a price and a date. Nothing is made until you agree to it.
          </p>
        </div>
      )}

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {occasion}
            {request.recipientName && <span className="text-foreground-muted"> for {request.recipientName}</span>}
          </h1>
          <p className="mt-1.5 text-sm text-foreground-subtle">Reference {request.reference}</p>
        </div>
        <RequestStatusChip status={request.status} />
      </header>

      <p className="mt-4 text-base text-foreground-muted">{REQUEST_STATUS_BLURB[request.status]}</p>

      {/* The finished song, when there is one. An ordinary track, so it gets
          the real player, artwork and the download button for free. */}
      {song && (
        <section className="mt-8 rounded-2xl border border-border bg-surface/40 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Your song</p>
          <div className="mt-4 flex items-center gap-4">
            <TrackArt src={song.coverUrl} alt={song.title} className="h-16 w-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-foreground">{song.title}</p>
              <p className="truncate text-sm text-foreground-muted">{song.artistName}</p>
            </div>
            <PlayButton track={song} size="lg" className="shrink-0" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <DownloadButton track={song} />
            {/* Reports what is true of the track, and only claims agreement
                when agreement was actually given. */}
            <p className="text-xs text-foreground-subtle">
              {!request.deliveredTrack?.isPublished
                ? "Private to your account — nobody else can find or play it."
                : request.publishConsent
                  ? "This song is also in the public catalogue, as you agreed."
                  : "This song is in the public catalogue. Tell us if that isn't what you wanted."}
            </p>
          </div>
        </section>
      )}

      {/* The quote, and what to do about it. */}
      {request.status === "QUOTED" && request.priceAmount !== null && request.priceCurrency && (
        <section className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-start gap-3">
            <Quote className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-sm text-foreground-muted">To make this song</p>
              <p className="mt-0.5 text-2xl font-semibold text-foreground">
                {formatPrice(request.priceAmount, request.priceCurrency)}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <QuoteActions
              requestId={request.id}
              accepted={!!request.quoteAcceptedAt}
              canCancel={canRequesterCancel(request.status)}
            />
          </div>
        </section>
      )}

      {request.status === "DECLINED" && request.declineReason && (
        <p className="mt-6 rounded-xl border border-border bg-surface/40 p-4 text-sm text-foreground-muted">
          {request.declineReason}
        </p>
      )}

      {/* The brief as submitted, so they can check what we're working from. */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Your brief</h2>
        <dl className="mt-4 flex flex-col gap-4 rounded-2xl border border-border p-5">
          <Detail label="The story">{request.story}</Detail>
          {request.mustInclude && <Detail label="Must include">{request.mustInclude}</Detail>}
          {request.relationship && <Detail label="Who they are to you">{request.relationship}</Detail>}
          {request.pronouns && <Detail label="Referred to as">{request.pronouns}</Detail>}
          {request.terms.length > 0 && <Detail label="Sound">{request.terms.map((t) => t.term.name).join(", ")}</Detail>}
          {request.language && <Detail label="Language">{request.language}</Detail>}
          {request.referenceUrl && <Detail label="Reference">{request.referenceUrl}</Detail>}
          {request.neededBy && (
            <Detail label="Needed by">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-foreground-subtle" />
                {request.neededBy.toISOString().slice(0, 10)}
              </span>
            </Detail>
          )}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Messages</h2>
        <p className="mt-1 text-sm text-foreground-muted">Anything you add here goes straight to the person making it.</p>
        <div className="mt-4">
          <RequestConversation
            requestId={request.id}
            endpoint="/api/requests"
            messages={request.messages}
            canPost={request.status !== "CANCELLED"}
          />
        </div>
      </section>
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
