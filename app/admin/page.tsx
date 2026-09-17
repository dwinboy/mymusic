import Link from "next/link";
import Image from "next/image";
import { Music2, Disc3, Mic2, PlayCircle, Download, Plus, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { formatCompactNumber, formatReleaseDate } from "@/lib/utils";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const [
    totalTracks,
    totalAlbums,
    totalArtists,
    totalPlays,
    totalDownloads,
    recentUploads,
    popularGroups,
    needsAttention,
  ] = await Promise.all([
      db.track.count(),
      db.album.count(),
      db.artist.count(),
      db.listeningHistory.count(),
      db.download.count(),
      db.track.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { artist: true },
      }),
      db.listeningHistory.groupBy({
        by: ["trackId"],
        _count: { trackId: true },
        orderBy: { _count: { trackId: "desc" } },
        take: 6,
      }),
      db.track.count({ where: { processingStatus: { not: "READY" } } }),
    ]);

  const popularTrackIds = popularGroups.map((g) => g.trackId);
  const popularTracksRaw = popularTrackIds.length
    ? await db.track.findMany({ where: { id: { in: popularTrackIds } }, include: { artist: true } })
    : [];
  const popularTracks = popularTrackIds
    .map((id) => popularTracksRaw.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const stats = [
    { label: "Total Tracks", value: totalTracks, icon: Music2 },
    { label: "Total Albums", value: totalAlbums, icon: Disc3 },
    { label: "Total Artists", value: totalArtists, icon: Mic2 },
    { label: "Total Plays", value: totalPlays, icon: PlayCircle },
    { label: "Total Downloads", value: totalDownloads, icon: Download },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-foreground-muted">An overview of your catalogue.</p>
        </div>
        <Button asChild>
          <Link href="/admin/tracks/new">
            <Plus className="h-4 w-4" /> Upload track
          </Link>
        </Button>
      </div>

      {needsAttention > 0 && (
        <Link
          href="/admin/tracks"
          className="mt-6 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 transition-colors hover:bg-danger/10"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {needsAttention} track{needsAttention === 1 ? "" : "s"} didn&apos;t finish processing
            </p>
            <p className="text-xs text-foreground-muted">
              They stay hidden from the public site until their audio is ready. Open Tracks → Needs attention.
            </p>
          </div>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
            <stat.icon className="h-4 w-4 text-foreground-subtle" />
            <p className="mt-3 text-2xl font-semibold text-foreground">{formatCompactNumber(stat.value)}</p>
            <p className="text-xs text-foreground-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Recent Uploads</h2>
          {recentUploads.length === 0 ? (
            <p className="text-sm text-foreground-muted">No tracks uploaded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
              {recentUploads.map((track) => (
                <Link
                  key={track.id}
                  href={`/admin/tracks/${track.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-active">
                    {track.coverUrl && <Image src={track.coverUrl} alt="" fill sizes="40px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                    <p className="truncate text-xs text-foreground-muted">{track.artist.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-foreground-subtle">{formatReleaseDate(track.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">
            Popular Tracks <span className="normal-case text-foreground-subtle">(by listens)</span>
          </h2>
          {popularTracks.length === 0 ? (
            <p className="text-sm text-foreground-muted">No listening activity recorded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
              {popularTracks.map((track, i) => (
                <Link
                  key={track.id}
                  href={`/admin/tracks/${track.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  <span className="tabular w-4 shrink-0 text-xs text-foreground-subtle">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                    <p className="truncate text-xs text-foreground-muted">{track.artist.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
