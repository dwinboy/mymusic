import { brandPreviewCard } from "@/lib/share-images";

/**
 * The link preview for every page that doesn't make its own — the homepage,
 * the commission page, About, and the policies. Song pages override it with
 * their own artwork card.
 *
 * Sharing a link with no picture is the difference between a message someone
 * taps and one they scroll past, and these are exactly the links people pass
 * to each other.
 */
export const alt = "Vibe Banger — original songs written from real experience";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image() {
  return brandPreviewCard({
    eyebrow: "Independent sound",
    title: "Songs with somebody's life in them",
    subtitle: "Original music written from real experience — or have one made for someone who matters to you.",
  });
}
