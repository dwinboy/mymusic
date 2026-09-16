"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Music2,
  Disc3,
  Mic2,
  ListMusic,
  Tags,
  BarChart3,
  HardDrive,
  Settings,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/tracks", label: "Tracks", icon: Music2 },
  { href: "/admin/albums", label: "Albums", icon: Disc3 },
  { href: "/admin/artists", label: "Artists", icon: Mic2 },
  { href: "/admin/playlists", label: "Playlists", icon: ListMusic },
  { href: "/admin/genres", label: "Genres", icon: Tags },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/storage", label: "Storage", icon: HardDrive },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-canvas-raised px-3 py-6 md:flex">
      <div className="px-2">
        <p className="text-sm font-semibold text-foreground">Lumen Admin</p>
        <p className="text-xs text-foreground-subtle">Content management</p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-0.5">
        {LINKS.map((link) => {
          const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-surface text-foreground" : "text-foreground-muted hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" /> View site
      </Link>
    </aside>
  );
}
