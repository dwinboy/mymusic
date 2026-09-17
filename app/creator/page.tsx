import Link from "next/link";
import { Upload, ArrowRight, Headphones, Users, Heart, Download, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BecomeCreator } from "@/components/creator/become-creator";
import { StudioTrackRow } from "@/components/creator/studio-track-row";
import { StatCard } from "@/components/creator/stat-card";
import { EmptyState } from "@/components/states/empty-state";
import { getCreatorContext } from "@/lib/creator-session";
import { getCreatorStats } from "@/lib/creator-analytics";
import { getStudioTracks } from "@/lib/creator-tracks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

export default async function CreatorOverviewPage() {
  const { user, profiles, profileIds } = await getCreatorContext("/creator");
  if (profiles.length === 0) return <BecomeCreator />;

  const [stats, tracks] = await Promise.all([getCreatorStats(profileIds, 30), getStudioTracks(profileIds)]);

  const counts = {
    live: tracks.filter((t) => t.status === "live").length,
    review: tracks.filter((t) => t.status === "review").length,
  };
  const attention = tracks.filter((t) => t.status === "changes" || t.status === "failed" || t.status === "draft");
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-8 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{firstName ? `Hi, ${firstName}` : "Creator Studio"}</h1>
          <p className="mt-1 text-foreground-muted">
            {counts.live} live · {counts.review} in review
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/creator/upload">
            <Upload className="h-4 w-4" /> Upload music
          </Link>
        </Button>
      </header>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">Last 30 days</h2>
          <Link href="/creator/analytics" className="text-sm text-foreground-muted transition-colors hover:text-foreground">
            Analytics
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Headphones} label="Plays" value={stats.plays} />
          <StatCard icon={Users} label="Listeners" value={stats.listeners} />
          <StatCard icon={Heart} label="Likes" value={stats.likes} />
          <StatCard icon={Download} label="Downloads" value={stats.downloads} />
        </div>
      </section>

      {attention.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Needs your attention</h2>
          <p className="mb-4 text-sm text-foreground-muted">Drafts to finish, and tracks with requested changes or failed audio.</p>
          <div className="flex flex-col">
            {attention.slice(0, 5).map((track) => (
              <StudioTrackRow key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent uploads</h2>
          {tracks.length > 0 && (
            <Link href="/creator/music" className="flex items-center gap-1 text-sm text-foreground-muted transition-colors hover:text-foreground">
              All music <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {tracks.length === 0 ? (
          <EmptyState
            icon={Music2}
            title="No music yet"
            description="Upload your first track. It goes live once our team has reviewed it."
            actionLabel="Upload music"
            actionHref="/creator/upload"
            className="rounded-3xl border border-dashed border-border"
          />
        ) : (
          <div className="flex flex-col">
            {tracks.slice(0, 6).map((track) => (
              <StudioTrackRow key={track.id} track={track} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
