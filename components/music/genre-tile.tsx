import Link from "next/link";
import { cn } from "@/lib/utils";

const PALETTE = [
  "from-[#3a2b1a] to-[#1a1305]",
  "from-[#1a2b2b] to-[#0a1414]",
  "from-[#2b1a2b] to-[#140a14]",
  "from-[#1a2b1f] to-[#0a1410]",
  "from-[#2b1a1a] to-[#140a0a]",
  "from-[#1a1f2b] to-[#0a0d14]",
];

export function GenreTile({
  genre,
  index = 0,
  className,
}: {
  genre: { slug: string; name: string };
  index?: number;
  className?: string;
}) {
  const gradient = PALETTE[index % PALETTE.length];

  return (
    <Link
      href={`/discover?genre=${genre.slug}`}
      className={cn(
        "group relative flex h-24 shrink-0 w-40 items-end overflow-hidden rounded-lg border border-border bg-gradient-to-br p-3 transition-transform hover:-translate-y-0.5 sm:w-44",
        gradient,
        className
      )}
    >
      <span className="text-base font-semibold text-foreground">{genre.name}</span>
    </Link>
  );
}
