"use client";

import Link from "next/link";
import { useRef } from "react";

/** The one name a morphing artwork claims. See app/globals.css. */
export const HERO_ART = "track-hero-art";

/**
 * A link whose artwork morphs into the destination's hero image.
 *
 * The name is claimed on click rather than rendered onto every card, because
 * a name is only useful in pairs: with every card named, opening a track
 * animated every artwork that happened to appear on both pages at once, and
 * several covers flew across the screen instead of one moving.
 */
export function ArtworkMorphLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onClick={() => {
        const art = ref.current?.firstElementChild;
        if (!(art instanceof HTMLElement)) return;
        art.style.viewTransitionName = HERO_ART;
        // Released once the transition has had its moment, so a cancelled
        // navigation doesn't leave this card holding the name.
        window.setTimeout(() => {
          art.style.viewTransitionName = "";
        }, 1000);
      }}
    >
      {children}
    </Link>
  );
}
