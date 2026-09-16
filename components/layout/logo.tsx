import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2 text-foreground focus-visible:outline-none",
        className
      )}
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 transition-transform group-hover:scale-105">
        <span className="h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="font-semibold tracking-[0.18em] text-[15px] uppercase">Lumen</span>
    </Link>
  );
}
