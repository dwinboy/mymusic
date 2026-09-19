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
          worker's cached shell, so the mark still draws when offline.

          Sized to sit just inside the bars that hold it — 40px in the 56px
          mobile header, 48px in the 64px desktop one — so the mark reads at a
          glance without either bar growing. */}
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={48}
        height={48}
        priority
        className="h-10 w-10 shrink-0 rounded-lg transition-transform group-hover:scale-105 lg:h-12 lg:w-12"
      />
      {/* Below 390px the wordmark plus the header's own controls no longer fit
          beside the larger mark, and the mark alone still identifies the app.
          390 rather than 380 because nothing ships at 380–389: it keeps the
          wordmark on an iPhone 14/15 (390) and a Pixel (393), and drops it on
          the 375px phones that never had room for it anyway. */}
      <span className="hidden whitespace-nowrap text-[15px] font-semibold uppercase tracking-[0.18em] min-[390px]:inline lg:text-lg">
        Vibe Banger
      </span>
    </Link>
  );
}
