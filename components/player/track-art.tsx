import Image from "next/image";
import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrackArt({
  src,
  alt,
  className,
  sizes = "64px",
  rounded = "rounded-md",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  rounded?: string;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-surface-active", rounded, className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-foreground-subtle">
          <Music2 className="h-1/3 w-1/3" />
        </div>
      )}
    </div>
  );
}
