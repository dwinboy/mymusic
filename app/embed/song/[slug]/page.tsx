import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrackBySlug } from "@/lib/queries";
import { toPlayerTrack } from "@/lib/mappers";
import { EmbedPlayer } from "@/components/embed/embed-player";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  return track ? { title: `${track.title} — ${track.artist.name}` } : {};
}

export default async function EmbedSongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) notFound();

  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  return (
    <EmbedPlayer
      track={toPlayerTrack(track, "medium")}
      songUrl={`${site}/song/${track.slug}`}
      artistUrl={`${site}/artist/${track.artist.slug}`}
    />
  );
}
