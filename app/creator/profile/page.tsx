import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ProfileForm, AddProfile } from "@/components/creator/profile-form";
import { getCreatorContext } from "@/lib/creator-session";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";
import { PUBLIC_TRACK_WHERE } from "@/lib/public-scope";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

const MAX_PROFILES = 5;

export default async function CreatorProfilePage() {
  const { profiles, profileIds } = await getCreatorContext("/creator/profile");
  if (profiles.length === 0) redirect("/creator");

  // A profile is public only once it has a live track; until then there's no
  // page to link to.
  const live = await db.track.groupBy({
    by: ["artistId"],
    where: { artistId: { in: profileIds }, ...PUBLIC_TRACK_WHERE },
    _count: true,
  });
  const liveCount = new Map(live.map((row) => [row.artistId, row._count]));
  const imageUploadsEnabled = isImageCloudinaryEnabled();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-8 md:py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{profiles.length > 1 ? "Profiles" : "Profile"}</h1>
        <p className="mt-1 text-foreground-muted">How listeners see you on Vibe Banger.</p>
      </header>

      {profiles.map((profile) => (
        <section key={profile.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            {liveCount.get(profile.id) ? (
              <Link href={`/artist/${profile.slug}`} className="inline-flex items-center gap-1.5 text-foreground-muted transition-colors hover:text-foreground">
                vibebanger.com/artist/{profile.slug} <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="text-foreground-subtle">Your public page appears once a track is live.</span>
            )}
          </div>
          <ProfileForm
            profile={{
              id: profile.id,
              name: profile.name,
              bio: profile.bio,
              location: profile.location,
              avatarUrl: profile.avatarUrl,
              coverUrl: profile.coverUrl,
            }}
            imageUploadsEnabled={imageUploadsEnabled}
          />
        </section>
      ))}

      {profiles.length < MAX_PROFILES && <AddProfile />}
    </div>
  );
}
