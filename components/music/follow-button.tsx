"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatCompactNumber } from "@/lib/utils";

/** Follow or unfollow a creator. Signed-out listeners are sent to sign in. */
export function FollowButton({
  artistId,
  artistName,
  initialFollowing,
  initialFollowers,
  size = "lg",
}: {
  artistId: string;
  artistName: string;
  initialFollowing: boolean;
  initialFollowers: number;
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const { status } = useSession();
  const { toast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    // Optimistic: the count moves with the button.
    const next = !following;
    setFollowing(next);
    setFollowers((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/artists/${artistId}/follow`, { method: next ? "POST" : "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setFollowing(data.following);
      setFollowers(data.followers);
      if (next) toast({ title: `Following ${artistName}`, description: "New releases show in your library." });
    } catch {
      setFollowing(!next);
      setFollowers((n) => Math.max(0, n + (next ? -1 : 1)));
      toast({ title: "Couldn't update", description: "Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant={following ? "secondary" : "outline"} size={size === "lg" ? "md" : "sm"} onClick={toggle} disabled={busy} className="rounded-full px-5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {following ? "Following" : "Follow"}
      </Button>
      {followers > 0 && (
        <span className="text-sm text-foreground-muted tabular">
          {formatCompactNumber(followers)} {followers === 1 ? "follower" : "followers"}
        </span>
      )}
    </div>
  );
}
