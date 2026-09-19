"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

export function MobileHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-canvas/80 backdrop-blur-md lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", viewTransitionName: "site-header" }}
    >
      <div className="flex h-14 items-center gap-3 px-4">
        <Logo />
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
