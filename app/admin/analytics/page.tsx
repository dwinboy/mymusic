import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCompactNumber, formatReleaseDate } from "@/lib/utils";
import { EmptyState } from "@/components/states/empty-state";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [mostPlayedGroups, mostDownloaded, recentHistory] = await Promise.all([
    db.listeningHistory.groupBy({
      by: ["trackId"],
      _count: { trackId: true },
      orderBy: { _count: { trackId: "desc" } },
      take: 10,
    }),
    db.track.findMany({ orderBy: { downloadCount: "desc" }, take: 10, include: { artist: true } }),
    db.listeningHistory.findMany({
      orderBy: { playedAt: "desc" },
      take: 15,
      include: { track: { include: { artist: true } }, user: true },
    }),
  ]);

  const mostPlayedIds = mostPlayedGroups.map((g) => g.trackId);
  const mostPlayedTracksRaw = mostPlayedIds.length
    ? await db.track.findMany({ where: { id: { in: mostPlayedIds } }, include: { artist: true } })
    : [];
  const mostPlayed = mostPlayedGroups
    .map((g) => ({ track: mostPlayedTracksRaw.find((t) => t.id === g.trackId), plays: g._count.trackId }))
    .filter((r): r is { track: NonNullable<typeof r.track>; plays: number } => !!r.track);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Live listening activity recorded from real playback sessions.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Most Played</h2>
          {mostPlayed.length === 0 ? (
            <EmptyState icon={BarChart3} title="No plays recorded yet" />
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
              {mostPlayed.map(({ track, plays }, i) => (
                <Link key={track.id} href={`/admin/tracks/${track.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                  <span className="tabular w-4 text-xs text-foreground-subtle">{i + 1}</span>
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-active">
                    {track.coverUrl && <Image src={track.coverUrl} alt="" fill sizes="36px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                    <p className="truncate text-xs text-foreground-muted">{track.artist.name}</p>
                  </div>
                  <span className="text-xs text-foreground-subtle">{formatCompactNumber(plays)} plays</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Most Downloaded</h2>
          {mostDownloaded.every((t) => t.downloadCount === 0) ? (
            <EmptyState icon={BarChart3} title="No downloads recorded yet" />
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
              {mostDownloaded
                .filter((t) => t.downloadCount > 0)
                .map((track) => (
                  <Link key={track.id} href={`/admin/tracks/${track.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-active">
                      {track.coverUrl && <Image src={track.coverUrl} alt="" fill sizes="36px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                      <p className="truncate text-xs text-foreground-muted">{track.artist.name}</p>
                    </div>
                    <span className="text-xs text-foreground-subtle">{formatCompactNumber(track.downloadCount)}</span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Recent Activity</h2>
        {recentHistory.length === 0 ? (
          <EmptyState icon={BarChart3} title="No activity yet" />
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {recentHistory.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-foreground-muted">{h.user?.name ?? h.user?.email ?? "Someone"}</span>
                <span className="text-foreground-subtle">played</span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {h.track.title} — {h.track.artist.name}
                </span>
                <span className="shrink-0 text-xs text-foreground-subtle">{formatReleaseDate(h.playedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
