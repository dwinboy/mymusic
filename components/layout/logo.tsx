import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2 rounded-lg text-foreground",
        className
      )}
    >
      {/* The PWA icon rather than the master: it is already in the service
          worker's cached shell, so the mark still draws when offline. */}
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={32}
        height={32}
        priority
        className="h-8 w-8 shrink-0 rounded-lg transition-transform group-hover:scale-105"
      />
      {/* Below ~380px the wordmark plus the header's own controls no longer fit,
          and the mark alone still identifies the app. */}
      <span className="hidden whitespace-nowrap font-semibold tracking-[0.18em] text-[15px] uppercase min-[380px]:inline">
        Vibe Banger
      </span>
    </Link>
  );
}
