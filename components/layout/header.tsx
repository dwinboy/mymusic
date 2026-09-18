"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { ChevronDown } from "lucide-react";
import { musicNavLinks, primaryNavLinks } from "./nav-links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "./user-menu";
import { SearchBar } from "@/components/search/search-bar";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 hidden border-b border-border bg-canvas/80 backdrop-blur-md md:block"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-8">
        <Logo />

        <nav className="flex items-center gap-1">
          {primaryNavLinks.map((link, i) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Fragment key={link.href}>
                {/* The Music menu sits after Discover. */}
                {i === 2 && <MusicMenu pathname={pathname} />}
                <Link
                  href={link.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-surface text-foreground" : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              </Fragment>
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

function MusicMenu({ pathname }: { pathname: string }) {
  const active = musicNavLinks.some((link) => pathname.startsWith(link.href));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
            active ? "bg-surface text-foreground" : "text-foreground-muted hover:text-foreground"
          )}
        >
          Music
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-1.5">
        {musicNavLinks.map((link) => (
          <DropdownMenuItem key={link.href} asChild className="gap-3 rounded-lg px-2.5 py-2">
            <Link href={link.href}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-accent">
                <link.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{link.label}</span>
                <span className="block truncate text-xs text-foreground-muted">{link.description}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
