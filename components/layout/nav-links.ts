import type { LucideIcon } from "lucide-react";
import { Home, Compass, Library, Search, Sparkles, Users } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/new-releases", label: "New Releases", icon: Sparkles },
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/library", label: "Library", icon: Library },
];

export const mobileNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Library },
];
