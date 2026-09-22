import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, Disc3, Repeat2 } from "lucide-react";
import { auth } from "@/auth";
import { listeningStats, formatListeningTime } from "@/lib/listening-stats";
import { TopTracksList } from "@/components/library/top-tracks-list";
import { EmptyState } from "@/components/states/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Your listening",
  // Nobody else's business, and nothing to gain from indexing it.
  robots: { index: false, follow: false },
};

const RANGES = {
  month: { label: "Last 30 days", days: 30 },
  year: { label: "Last 12 months", days: 365 },
  all: { label: "All time", days: null },
} as const;

type RangeKey = keyof typeof RANGES;

export default async function ListeningPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/library/listening");

  const { range } = await searchParams;
  const active: RangeKey = range === "year" || range === "all" ? range : "month";
  const stats = await listeningStats(session.user.id, RANGES[active].days);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <Link
        href="/library?tab=history"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your listening</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Only you can see this. It comes from the history already kept for Continue Listening — nothing new is recorded
        to make it.
      </p>

      <Tabs value={active} className="mt-7">
        <TabsList>
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <TabsTrigger key={key} value={key} asChild>
              <Link href={key === "month" ? "/library/listening" : `/library/listening?range=${key}`}>
                {RANGES[key].label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={active} className="mt-6">
          {stats.plays === 0 ? (
            <EmptyState
              icon={Clock3}
              title={active === "all" ? "Nothing played yet" : `Nothing played in the ${RANGES[active].label.toLowerCase()}`}
              description="Play something and it starts adding up here."
            />
          ) : (
            <div className="flex flex-col gap-10">
              <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
                <Stat icon={Clock3} value={formatListeningTime(stats.seconds)} label="listened" />
                <Stat icon={Repeat2} value={stats.plays.toLocaleString()} label={stats.plays === 1 ? "song played" : "songs played"} />
                <Stat icon={Disc3} value={stats.distinctTracks.toLocaleString()} label={stats.distinctTracks === 1 ? "different song" : "different songs"} />
              </div>

              {stats.topArtists.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {stats.topArtists.length === 1 ? "The artist you played" : "Artists you played most"}
                  </h2>
                  <ol className="mt-4 flex flex-col gap-px overflow-hidden rounded-2xl border border-border bg-border">
                    {stats.topArtists.map((artist, index) => (
                      <li key={artist.id} className="flex items-center gap-4 bg-canvas px-4 py-3">
                        <span className="w-5 shrink-0 text-sm tabular-nums text-foreground-subtle">{index + 1}</span>
                        <Link
                          href={`/artist/${artist.slug}`}
                          className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline"
                        >
                          {artist.name}
                        </Link>
                        <span className="shrink-0 text-sm tabular-nums text-foreground-muted">
                          {artist.plays} {artist.plays === 1 ? "play" : "plays"}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {stats.topTracks.length === 1 ? "The song you played" : "Songs you played most"}
                </h2>
                <div className="mt-4">
                  <TopTracksList entries={stats.topTracks} />
                </div>
              </section>

              {stats.firstPlayedAt && (
                <p className="text-xs text-foreground-subtle">
                  You&apos;ve been listening here since{" "}
                  {stats.firstPlayedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * One line each on a phone, a tile on anything wider. Stacked tiles gave
 * three numbers most of a phone screen to themselves.
 */
function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2.5 bg-canvas px-4 py-3 sm:flex-col sm:items-start sm:gap-0 sm:p-5">
      <Icon className="h-4 w-4 shrink-0 translate-y-0.5 text-accent sm:mb-2.5 sm:translate-y-0" />
      <p className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">{value}</p>
      <p className="text-sm text-foreground-muted sm:mt-0.5">{label}</p>
    </div>
  );
}
