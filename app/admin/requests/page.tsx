import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { EmptyState } from "@/components/states/empty-state";
import { RequestStatusChip } from "@/components/requests/request-status-chip";
import { OPEN_STATUSES, formatPrice, REQUEST_STATUS_LABELS } from "@/lib/song-requests/status";
import type { SongRequestStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Commissions" };

const FILTERS: { value: string; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "SUBMITTED", label: REQUEST_STATUS_LABELS.SUBMITTED },
  { value: "QUOTED", label: REQUEST_STATUS_LABELS.QUOTED },
  { value: "ACCEPTED", label: REQUEST_STATUS_LABELS.ACCEPTED },
  { value: "IN_PRODUCTION", label: REQUEST_STATUS_LABELS.IN_PRODUCTION },
  { value: "DELIVERED", label: REQUEST_STATUS_LABELS.DELIVERED },
  { value: "all", label: "Everything" },
];

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await requireAdmin())) notFound();

  const { status: filter = "open" } = await searchParams;
  const where =
    filter === "all"
      ? {}
      : filter !== "open" && FILTERS.some((f) => f.value === filter)
        ? { status: filter as SongRequestStatus }
        : { status: { in: OPEN_STATUSES } };

  const requests = await db.songRequest.findMany({
    where,
    // Deadline first, undated last: a song needed on Saturday outranks an
    // older brief with no date on it.
    orderBy: [{ neededBy: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: 200,
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
      quoteAcceptedAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Commissions</h1>
      <p className="mt-1.5 text-sm text-foreground-muted">
        Songs people have asked to have made. Quote them, then deliver a track against the brief.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.value}
            href={`/admin/requests?status=${option.value}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              filter === option.value
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border-strong text-foreground-muted hover:text-foreground"
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={Inbox} title="Nothing here" description="No commissions match this filter." />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-border border-y border-border">
          {requests.map((request) => {
            const occasion = request.occasionTerm?.name ?? request.occasionNote ?? "A song";
            const due = request.neededBy?.toISOString().slice(0, 10);
            const overdue = !!due && due < today && request.status !== "DELIVERED";
            return (
              <li key={request.id}>
                <Link
                  href={`/admin/requests/${request.id}`}
                  className="flex flex-col gap-2 py-4 transition-colors hover:bg-surface-hover sm:flex-row sm:items-center sm:gap-4 sm:px-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {occasion}
                      {request.recipientName && <span className="text-foreground-muted"> for {request.recipientName}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-foreground-subtle">
                      {request.reference} · {request.user.name ?? request.user.email}
                      {request.priceAmount !== null &&
                        request.priceCurrency &&
                        ` · ${formatPrice(request.priceAmount, request.priceCurrency)}`}
                      {request.quoteAcceptedAt && " · accepted"}
                    </p>
                  </div>
                  {due && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 text-xs",
                        overdue ? "text-danger" : "text-foreground-muted"
                      )}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      {due}
                    </span>
                  )}
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
