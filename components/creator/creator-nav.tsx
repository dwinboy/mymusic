"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, UploadCloud, Music2, BarChart3, UserRound, ArrowUpRight, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/creator", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/creator/upload", label: "Upload", icon: UploadCloud },
  { href: "/creator/music", label: "Music", icon: Music2 },
  { href: "/creator/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/creator/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, link: (typeof LINKS)[number]) {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

/** Before a profile exists every studio page redirects to onboarding, so only Overview is offered. */
function linksFor(hasProfile: boolean) {
  return hasProfile ? LINKS : LINKS.slice(0, 1);
}

export function CreatorSidebar({ profileName, hasProfile }: { profileName?: string; hasProfile: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-canvas-raised/60 px-4 py-6 md:flex">
      <div className="px-2">
        <Logo />
        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-accent">Creator Studio</p>
        {profileName && <p className="mt-1 truncate text-sm text-foreground-muted">{profileName}</p>}
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {linksFor(hasProfile).map((link) => {
          const active = isActive(pathname, link);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-surface text-foreground" : "text-foreground-muted hover:bg-surface/60 hover:text-foreground"
              )}
            >
              <link.icon className={cn("h-[18px] w-[18px]", active && "text-accent")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
      >
        <ArrowUpRight className="h-4 w-4" /> Back to listening
      </Link>
    </aside>
  );
}

export function CreatorMobileNav({ hasProfile }: { hasProfile: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      className="scrollbar-hidden sticky top-0 z-30 flex items-center gap-1 overflow-x-auto border-b border-border bg-canvas/90 px-3 py-2.5 backdrop-blur-xl md:hidden"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
    >
      <Link
        href="/"
        aria-label="Back to listening"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors active:bg-surface"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </Link>
      <span className="mx-1 h-5 w-px shrink-0 bg-border-strong" aria-hidden />
      {linksFor(hasProfile).map((link) => {
        const active = isActive(pathname, link);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
              active ? "bg-surface text-foreground" : "text-foreground-muted"
            )}
          >
            <link.icon className={cn("h-4 w-4", active && "text-accent")} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
