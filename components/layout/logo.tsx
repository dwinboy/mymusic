import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The mark, on the bar rather than in a box.
 *
 * It used to draw the PWA icon — the same file the home screen gets, which
 * carries its own black square because a glowing mark needs a dark ground
 * wherever a platform might paint a light one. In the app's own chrome that
 * ground is already there, so all the square did was sit visibly on the
 * near-black header and box the mark in. public/brand/mark.png is the same
 * artwork with the ground taken away and trimmed to its own edges, so a
 * height here is the height of what you actually see.
 *
 * "hero" is the sign-in page, where the mark is the only thing above the
 * form and can be as large as it likes.
 */
export function Logo({ className, variant = "header" }: { className?: string; variant?: "header" | "hero" }) {
  const hero = variant === "hero";

  return (
    <Link
      href="/"
      className={cn(
        // shrink-0 so the row can never squeeze the link narrower than its
        // own contents: the wordmark never wraps, so a squeezed link doesn't
        // shrink the text, it just paints it over whatever comes next.
        "group inline-flex shrink-0 items-center rounded-lg text-foreground",
        hero ? "gap-3" : "gap-2",
        className
      )}
    >
      <Image
        src="/brand/mark.png"
        alt=""
        width={512}
        height={350}
        priority
        className={cn(
          "w-auto shrink-0 transition-transform group-hover:scale-105",
          hero ? "h-16 sm:h-20" : "h-10 lg:h-12"
        )}
      />
      {/* The wordmark waits until there is room for it beside the mark and the
          header's own controls — measured at 420px, where a signed-out header
          carrying Log in and Sign up still leaves a comfortable gap. It used
          to appear from 390px, against a mark half this width; at this size
          the two collided on exactly the phones that breakpoint existed to
          serve, with the wordmark painting over the search icon. The mark
          alone identifies the app, and now does it far better than the boxed
          one did. The sign-in page has a column to itself and never drops it. */}
      <span
        className={cn(
          "whitespace-nowrap font-semibold uppercase",
          hero
            ? "text-xl tracking-[0.2em] sm:text-2xl"
            : "hidden text-[15px] tracking-[0.18em] min-[420px]:inline lg:text-lg"
        )}
      >
        Vibe Banger
      </span>
    </Link>
  );
}
