import Link from "next/link";
import { LEGAL, LEGAL_PAGES } from "@/lib/legal";

/**
 * The quiet line at the foot of every page.
 *
 * A policy nobody can reach is worse than no policy, so these links have to
 * exist somewhere on every screen — but a music app is not a corporate site,
 * and a full footer under a phone screen would be noise on top of the bottom
 * nav and the player. One wrapping row of small muted links and a copyright
 * line is enough to make them reachable without making the app feel heavier.
 */
export function Footer() {
  return (
    <footer className="mt-14 border-t border-border px-4 py-5 sm:px-8">
      {/* One wrapping row rather than a block per thing: on a phone the links
          take two lines and the copyright joins the end of the second,
          instead of claiming a third line of its own. */}
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1.5">
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="text-xs text-foreground-subtle transition-colors hover:text-foreground"
          >
            {page.label}
          </Link>
        ))}
        <p className="text-xs text-foreground-subtle sm:ml-auto">
          © {new Date().getFullYear()} {LEGAL.siteName}
        </p>
      </div>
    </footer>
  );
}
