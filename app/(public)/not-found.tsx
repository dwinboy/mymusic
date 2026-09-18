import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Not found" };

/**
 * A dead link is a normal event here, not an edge case: songs get shared far
 * and wide, then unpublished, renamed or deleted. Living inside the public
 * layout means the header, the navigation and — the part that matters — the
 * player all survive, so a rotten link someone sent you no longer stops the
 * music you were already listening to.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        This one isn&rsquo;t here
      </h1>
      <p className="mt-3 text-base text-foreground-muted">
        The page may have moved, or the music may have been taken down. Whatever was playing still is.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/discover">
            <Compass className="h-4 w-4" /> Discover music
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/search">
            <Search className="h-4 w-4" /> Search
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/">
            <Home className="h-4 w-4" /> Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
