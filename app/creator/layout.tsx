import type { Metadata } from "next";
import { getCreatorContext } from "@/lib/creator-session";
import { CreatorSidebar, CreatorMobileNav } from "@/components/creator/creator-nav";
import { PlayerShell } from "@/components/player/player-shell";

export const metadata: Metadata = {
  title: { default: "Creator Studio", template: "%s — Creator Studio" },
  // Private workspace: nothing here should be indexed.
  robots: { index: false, follow: false },
};

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { profiles } = await getCreatorContext();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <CreatorSidebar
        hasProfile={profiles.length > 0}
        profileName={profiles.length === 1 ? profiles[0].name : profiles.length > 1 ? `${profiles.length} profiles` : undefined} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CreatorMobileNav hasProfile={profiles.length > 0} />
        {/* Room for the mini player and bottom safe area on phones. */}
        <main className="flex-1 pb-28 md:pb-10">{children}</main>
      </div>
      {/* Keeps playback going while creators work in the studio. */}
      <PlayerShell />
    </div>
  );
}
