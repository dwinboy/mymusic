import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Matches the implicit id (start_url) earlier installs already have, so
    // setting it explicitly doesn't create a second app.
    id: "/",
    name: "Vibe Banger — Independent Sound",
    short_name: "Vibe Banger",
    description: "Original songs written from real experience. Stream them, keep them offline, or have a song made for someone who matters to you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    orientation: "portrait",
    categories: ["music", "entertainment"],
    // Tapping the icon while the app is already running returns to it rather
    // than starting a second copy — which, for a music app, would mean
    // whatever was playing stops and the queue is lost.
    launch_handler: { client_mode: "focus-existing" },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the app icon (Android, desktop) to jump straight in.
    shortcuts: [
      { name: "Search", url: "/search", icons: [{ src: "/icons/shortcuts/search.png", sizes: "96x96", type: "image/png" }] },
      { name: "Discover", url: "/discover", icons: [{ src: "/icons/shortcuts/discover.png", sizes: "96x96", type: "image/png" }] },
      { name: "Library", url: "/library", icons: [{ src: "/icons/shortcuts/library.png", sizes: "96x96", type: "image/png" }] },
      {
        name: "Downloads",
        short_name: "Offline",
        description: "Music saved on this device",
        url: "/downloads",
        icons: [{ src: "/icons/shortcuts/downloads.png", sizes: "96x96", type: "image/png" }],
      },
    ],
    // Shown in the richer install dialog on Android and desktop Chrome.
    screenshots: [
      { src: "/screenshots/home-narrow.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: "Home: featured music and quick picks" },
      { src: "/screenshots/now-playing-narrow.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: "Full-screen player" },
      { src: "/screenshots/discover-narrow.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: "Discover by mood, activity and genre" },
      { src: "/screenshots/home-wide.jpg", sizes: "1920x1200", type: "image/jpeg", form_factor: "wide", label: "Vibe Banger on desktop" },
      { src: "/screenshots/song-wide.jpg", sizes: "1920x1200", type: "image/jpeg", form_factor: "wide", label: "Song page" },
    ],
  };
}
