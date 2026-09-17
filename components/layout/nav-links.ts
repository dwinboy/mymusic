import type { LucideIcon } from "lucide-react";
import { Home, Compass, Library, Search, Download, Music2, Disc3, Mic2, ListMusic, Sparkles } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The catalogue, grouped under "Music" on desktop and linked from Discover on phones. */
export const musicNavLinks: (NavLink & { description: string })[] = [
  { href: "/songs", label: "Songs", icon: Music2, description: "Every song, with filters" },
  { href: "/albums", label: "Albums", icon: Disc3, description: "New, popular and featured" },
  { href: "/artists", label: "Artists", icon: Mic2, description: "The creators behind the music" },
  { href: "/playlists", label: "Playlists", icon: ListMusic, description: "Editorial picks and collections" },
  { href: "/new-releases", label: "New Releases", icon: Sparkles, description: "Just published" },
];

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  // "Music" renders as a menu of musicNavLinks between these.
  { href: "/library", label: "Library", icon: Library },
  { href: "/downloads", label: "Downloads", icon: Download },
];

export const mobileNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Library },
];
