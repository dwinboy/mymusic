"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { primaryNavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";
import { SearchBar } from "@/components/search/search-bar";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 hidden border-b border-border bg-canvas/80 backdrop-blur-md md:block"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-8">
        <Logo />

        <nav className="flex items-center gap-1">
          {primaryNavLinks.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface text-foreground"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <SearchBar className="w-72" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
