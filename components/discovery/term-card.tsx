import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Editorial card for a genre, mood, activity or occasion. Deliberately a
 * different visual register from track cards: wider, typographic, artwork as
 * atmosphere behind the name rather than a square cover you'd press play on.
 *
 * With no artwork available it stays typographic on a quiet surface instead of
 * inventing a colour gradient.
 */
export function TermCard({
  href,
  name,
  imageUrl,
  meta,
  size = "md",
  className,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  meta?: string;
  /** `fill` takes its width from a grid cell instead of a fixed rail width. */
  size?: "sm" | "md" | "lg" | "fill";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        // Gold on hover rather than a grey border: on a pointer device the
        // card lifts a little and its edge warms, which is the moment the
        // interface answers back. Gated on can-hover so a phone — where
        // every card would otherwise sit in a permanent hover state after a
        // tap — is left alone, and the press feedback below is what touch
        // gets instead.
        "card-lift group relative flex shrink-0 flex-col justify-end overflow-hidden rounded-xl border border-border bg-surface p-4 transition-[border-color] duration-300 active:scale-[0.99]",
        size === "sm" && "h-24 w-40 sm:w-44",
        size === "md" && "aspect-[4/3] w-44 sm:w-56",
        size === "lg" && "aspect-[16/10] w-72 sm:w-80",
        size === "fill" && "aspect-[4/3] w-full",
        className
      )}
    >
      {imageUrl && (
        <>
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes={
              size === "fill"
                ? "(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                : size === "lg"
                  ? "320px"
                  : "224px"
            }
            className="object-cover opacity-70 transition-[opacity,transform] duration-700 ease-out group-hover:scale-105 group-hover:opacity-85"
          />
          {/* Weighted to the bottom so the name stays legible over any cover. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
        </>
      )}
      <div className="relative">
        <p
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg"
          )}
        >
          {name}
        </p>
        {meta && <p className="mt-0.5 text-xs text-foreground-muted">{meta}</p>}
      </div>
    </Link>
  );
}
