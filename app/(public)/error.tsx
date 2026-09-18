"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when a page throws. Inside the public layout, so the player keeps
 * going while this is on screen — a failure to load one page is no reason to
 * stop the music.
 *
 * `retry` re-renders the segment, which is usually enough: most failures here
 * are a query that timed out rather than anything permanently broken.
 */
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser and in server logs; the digest is what ties a
    // report from a listener to the actual stack.
    console.error("Page failed to render", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-danger">Something broke</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        This page didn&rsquo;t load
      </h1>
      <p className="mt-3 text-base text-foreground-muted">
        It&rsquo;s our side, not yours. Try again — and anything playing is unaffected.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={retry}>
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/discover">
            <Compass className="h-4 w-4" /> Discover music
          </Link>
        </Button>
      </div>

      {error.digest && (
        <p className="mt-8 text-xs text-foreground-subtle">
          Reference <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
