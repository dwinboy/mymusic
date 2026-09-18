"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNavLinks } from "./nav-links";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-canvas/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", viewTransitionName: "bottom-nav" }}
    >
      <div className="flex h-16 items-stretch justify-around">
        {mobileNavLinks.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-w-[64px] flex-col items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium"
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-accent" : "text-foreground-subtle"
                )}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span className={cn(isActive ? "text-foreground" : "text-foreground-subtle")}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
