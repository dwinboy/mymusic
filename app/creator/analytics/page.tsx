import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Headphones, Users, CheckCircle2, Heart, ListPlus, Download, X, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/creator/stat-card";
import { TrendChart } from "@/components/creator/trend-chart";
import { EmptyState } from "@/components/states/empty-state";
import { getCreatorContext } from "@/lib/creator-session";
import { getCreatorStats, getDailyTrend, getTopTracks, type Range } from "@/lib/creator-analytics";
import { resolveImageUrl } from "@/lib/media/image-service";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

const RANGES: { key: string; label: string; days: Range }[] = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

export default async function CreatorAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; track?: string }>;
}) {
  const { profiles, profileIds } = await getCreatorContext("/creator/analytics");
  if (profiles.length === 0) redirect("/creator");

  const params = await searchParams;
  const range = RANGES.find((r) => r.key === params.range) ?? RANGES[1];
  // Only honour a track filter for a track this creator owns.
  const focus = params.track
    ? await db.track.findFirst({ where: { id: params.track, artistId: { in: profileIds } }, select: { id: true, title: true } })
    : null;

  const trendDays = range.days ?? 90;
  const [stats, trend, top, publishedCount] = await Promise.all([
    getCreatorStats(profileIds, range.days, focus?.id),
    getDailyTrend(profileIds, trendDays, focus?.id),
    focus ? Promise.resolve([]) : getTopTracks(profileIds, range.days, 10),
    // Tracks that are live or have been listened to: one briefly back in
    // review still has history worth showing.
    db.track.count({ where: { artistId: { in: profileIds }, OR: [{ isPublished: true }, { playCount: { gt: 0 } }] } }),
  ]);

  const href = (next: { range?: string; track?: string | null }) => {
    const query = new URLSearchParams();
    const r = next.range ?? range.key;
    if (r !== "30") query.set("range", r);
    const t = next.track === undefined ? focus?.id : next.track;
    if (t) query.set("track", t);
    const qs = query.toString();
    return qs ? `/creator/analytics?${qs}` : "/creator/analytics";
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 md:py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="mt-1 text-foreground-muted">
          A play counts after 30 seconds of listening, or half of a shorter track. Numbers are totals — never who listened.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex rounded-full border border-border-strong p-1" aria-label="Time range">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={href({ range: r.key })}
              aria-current={r.key === range.key ? "page" : undefined}
              className={cn(
                "flex h-8 items-center rounded-full px-3.5 text-sm transition-colors",
                r.key === range.key ? "bg-foreground text-canvas" : "text-foreground-muted hover:text-foreground"
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        {focus && (
          <Link
            href={href({ track: null })}
            className="flex h-10 max-w-full items-center gap-2 rounded-full bg-surface px-4 text-sm text-foreground transition-colors hover:bg-surface-hover"
          >
            <span className="truncate">{focus.title}</span>
            <X className="h-4 w-4 shrink-0 text-foreground-muted" />
          </Link>
        )}
      </div>

      {publishedCount === 0 && !focus ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing to measure yet"
          description="Analytics start once one of your tracks is live and people begin listening."
          actionLabel="My music"
          actionHref="/creator/music"
          className="rounded-3xl border border-dashed border-border"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard icon={Headphones} label="Plays" value={stats.plays} />
            <StatCard icon={Users} label="Listeners" value={stats.listeners} />
            <StatCard icon={CheckCircle2} label="Listened to the end" value={stats.completionRate} format="percent" />
            <StatCard icon={Heart} label="Likes" value={stats.likes} />
            <StatCard icon={ListPlus} label="Playlist adds" value={stats.playlistAdds} />
            <StatCard icon={Download} label="Downloads" value={stats.downloads} />
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">{range.days ? "Trend" : "Trend · last 90 days"}</h2>
            <TrendChart points={trend} />
          </section>

          {!focus && top.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Top tracks</h2>
              <ol className="flex flex-col">
                <li className="flex items-center gap-4 px-3 pb-2 text-xs uppercase tracking-wide text-foreground-subtle">
                  <span className="w-5" />
                  <span className="flex-1">Track</span>
                  <span className="w-16 text-right">Plays</span>
                  <span className="hidden w-20 text-right sm:block">Listeners</span>
                </li>
                {top.map(({ track, plays, listeners }, index) => {
                  const cover = resolveImageUrl(
                    { publicId: track.coverImagePublicId ?? track.album?.coverImagePublicId, fallbackUrl: track.coverUrl ?? track.album?.coverUrl ?? null },
                    "thumbnail"
                  );
                  return (
                    <li key={track.id}>
                      <Link
                        href={href({ track: track.id })}
                        className="flex items-center gap-4 rounded-2xl px-3 py-2.5 transition-colors can-hover:hover:bg-surface/60"
                      >
                        <span className="w-5 text-right text-sm text-foreground-subtle tabular">{index + 1}</span>
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface">
                            {cover && <Image src={cover} alt="" fill sizes="40px" className="object-cover" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">{track.title}</span>
                            <span className="block truncate text-sm text-foreground-muted">{track.artist.name}</span>
                          </span>
                        </span>
                        <span className="w-16 text-right text-sm text-foreground tabular">{plays.toLocaleString()}</span>
                        <span className="hidden w-20 text-right text-sm text-foreground-muted tabular sm:block">{listeners.toLocaleString()}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
