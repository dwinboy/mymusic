import { brandPreviewCard } from "@/lib/share-images";

/**
 * The commission page's own preview. It is the link most likely to be sent
 * to one person on purpose — "look, you can have one made" — so it says what
 * the page offers rather than repeating the site's general pitch.
 */
export const alt = "Have a song made for someone — Vibe Banger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image() {
  return brandPreviewCard({
    eyebrow: "Commissions",
    title: "Have a song made for someone",
    subtitle: "A birthday, a wedding, a goodbye. Tell us the story and we'll write an original song from it.",
  });
}
