"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function LikeButton({
  trackId,
  initialLiked = false,
  size = "md",
  className,
}: {
  trackId: string;
  initialLiked?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  const iconSize = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }[size];

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      router.push("/login");
      return;
    }

    const next = !liked;
    setLiked(next);

    startTransition(async () => {
      try {
        const res = next
          ? await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trackId }),
            })
          : await fetch(`/api/favorites?trackId=${trackId}`, { method: "DELETE" });

        if (!res.ok) throw new Error();
      } catch {
        setLiked(!next);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-pressed={liked}
      aria-label={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      className={cn(
        "flex items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground disabled:opacity-60",
        className
      )}
    >
      <Heart className={cn(iconSize, liked && "fill-accent text-accent")} />
    </button>
  );
}
