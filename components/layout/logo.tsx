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
          hero ? "h-16 sm:h-20" : "h-9 lg:h-11"
        )}
      />
      {/* The wordmark has to share a 390px phone with the mark, a search icon
          and — signed out, which is the widest case — Log in and Sign up. It
          fits there only at a smaller size, so it steps up rather than
          switching on: tighter and a shade smaller on a phone, full size once
          there is room for it. Hiding it below 390px keeps the 375px phones
          that never had space from having the mark squeezed. The sign-in page
          has a column to itself and never drops it. */}
      <span
        className={cn(
          "whitespace-nowrap font-semibold uppercase",
          hero
            ? "text-xl tracking-[0.2em] sm:text-2xl"
            : "hidden text-[13px] tracking-[0.1em] min-[390px]:inline min-[412px]:text-[15px] min-[412px]:tracking-[0.18em] lg:text-lg lg:tracking-[0.18em]"
        )}
      >
        Vibe Banger
      </span>
    </Link>
  );
}
