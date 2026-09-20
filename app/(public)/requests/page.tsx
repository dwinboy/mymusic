import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Music4 } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { RequestStatusChip } from "@/components/requests/request-status-chip";
import { formatPrice } from "@/lib/song-requests/status";

export const metadata: Metadata = { title: "Your requests" };

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/requests");

  const requests = await db.songRequest.findMany({
    where: { userId: session.user.id },
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
      deliveredTrack: { select: { title: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Commissions</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your requests</h1>
        </div>
        <Button asChild>
          <Link href="/request">Request a song</Link>
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Music4}
            title="No requests yet"
            description="Have a song written for someone — tell us the story and we'll make it."
            actionLabel="Request a song"
            actionHref="/request"
          />
        </div>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-border border-y border-border">
          {requests.map((request) => {
            const occasion = request.occasionTerm?.name ?? request.occasionNote ?? "A song";
            return (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex flex-col gap-2 py-4 transition-colors hover:bg-surface-hover sm:flex-row sm:items-center sm:gap-4 sm:px-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {occasion}
                      {request.recipientName && <span className="text-foreground-muted"> for {request.recipientName}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-foreground-subtle">
                      {request.reference}
                      {request.deliveredTrack && ` · ${request.deliveredTrack.title}`}
                      {request.priceAmount !== null &&
                        request.priceCurrency &&
                        ` · ${formatPrice(request.priceAmount, request.priceCurrency)}`}
                    </p>
                  </div>
                  <RequestStatusChip status={request.status} className="shrink-0 self-start sm:self-auto" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
