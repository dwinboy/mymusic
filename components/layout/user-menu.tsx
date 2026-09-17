"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, User as UserIcon, Download, Heart, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-surface-active" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button variant="primary" size="sm" asChild>
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  const initials = (session.user.name || session.user.email || "?").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Avatar>
            <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "Profile"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{session.user.name ?? session.user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/library">
            <UserIcon className="h-4 w-4" /> Library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/library?tab=liked">
            <Heart className="h-4 w-4" /> Liked songs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/downloads">
            <Download className="h-4 w-4" /> Downloads
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Offered to every listener: the studio onboards anyone without a
            creator profile, so there's no separate "become a creator" step. */}
        <DropdownMenuItem asChild>
          <Link href="/creator">
            <Sparkles className="h-4 w-4" /> Creator Studio
          </Link>
        </DropdownMenuItem>
        {session.user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboard className="h-4 w-4" /> Admin dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
