import { cn } from "@/lib/utils";

export function HorizontalScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-hidden -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8",
        className
      )}
    >
      {children}
    </div>
  );
}
