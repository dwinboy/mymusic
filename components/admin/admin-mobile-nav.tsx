"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/albums", label: "Albums" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/playlists", label: "Playlists" },
  { href: "/admin/genres", label: "Genres" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/storage", label: "Storage" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="scrollbar-hidden sticky top-0 z-30 flex gap-1 overflow-x-auto border-b border-border bg-canvas-raised px-3 py-2.5 md:hidden">
      {LINKS.map((link) => {
        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive ? "bg-surface text-foreground" : "text-foreground-muted"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
