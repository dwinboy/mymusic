import { cn } from "@/lib/utils";

export function Equalizer({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-3.5 items-end gap-[2px]", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="eq-bar w-[3px] rounded-full bg-accent"
          style={{ height: "100%", animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
