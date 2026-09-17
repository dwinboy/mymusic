import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioTrackRow } from "@/components/creator/studio-track-row";
import { TrackActions } from "@/components/creator/track-actions";
import { EmptyState } from "@/components/states/empty-state";
import { getCreatorContext } from "@/lib/creator-session";
import { getStudioTracks } from "@/lib/creator-tracks";
import type { CreatorTrackStatus } from "@/lib/creator-status";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "My music" };

const TABS: { key: string; label: string; statuses: CreatorTrackStatus[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "live", label: "Live", statuses: ["live"] },
  { key: "review", label: "In review", statuses: ["review"] },
  { key: "drafts", label: "Drafts", statuses: ["draft", "changes"] },
  { key: "processing", label: "Processing", statuses: ["processing"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
  { key: "hidden", label: "Hidden", statuses: ["unpublished"] },
];

export default async function CreatorMusicPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { profiles, profileIds } = await getCreatorContext("/creator/music");
  if (profiles.length === 0) redirect("/creator");

  const { status = "all" } = await searchParams;
  const active = TABS.find((t) => t.key === status) ?? TABS[0];
  const tracks = await getStudioTracks(profileIds);

  const inTab = (tab: (typeof TABS)[number]) => (tab.statuses ? tracks.filter((t) => tab.statuses!.includes(t.status)) : tracks);
  const shown = inTab(active);
  // Tabs with nothing in them are noise; "All" and the current tab always show.
  const tabs = TABS.filter((tab) => tab.key === "all" || tab.key === active.key || inTab(tab).length > 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">My music</h1>
          <p className="mt-1 text-foreground-muted">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/creator/upload">
            <Upload className="h-4 w-4" /> Upload music
          </Link>
        </Button>
      </header>

      {tracks.length > 0 && (
        <nav className="scrollbar-hidden -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Filter by status">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/creator/music" : `/creator/music?status=${tab.key}`}
              aria-current={tab.key === active.key ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                tab.key === active.key
                  ? "border-foreground bg-foreground text-canvas"
                  : "border-border-strong text-foreground-muted hover:text-foreground"
              )}
            >
              {tab.label}
              <span className={cn("tabular text-xs", tab.key === active.key ? "text-canvas/70" : "text-foreground-subtle")}>
                {inTab(tab).length}
              </span>
            </Link>
          ))}
        </nav>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon={Music2}
          title={tracks.length === 0 ? "No music yet" : `Nothing ${active.label.toLowerCase()}`}
          description={tracks.length === 0 ? "Upload your first track. It goes live once our team has reviewed it." : undefined}
          actionLabel={tracks.length === 0 ? "Upload music" : "Show all"}
          actionHref={tracks.length === 0 ? "/creator/upload" : "/creator/music"}
          className="rounded-3xl border border-dashed border-border"
        />
      ) : (
        <div className="flex flex-col">
          <div className="hidden items-center gap-4 px-3 pb-2 text-xs uppercase tracking-wide text-foreground-subtle md:flex">
            <span className="flex-1">Title</span>
            <span className="w-16 text-right">Length</span>
            <span className="w-20 text-right">Plays</span>
            <span className="w-40 text-right">Status</span>
            <span className="w-10" />
          </div>
          {shown.map((track) => (
            <StudioTrackRow key={track.id} track={track} actions={<TrackActions track={track} />} />
          ))}
        </div>
      )}
    </div>
  );
}
