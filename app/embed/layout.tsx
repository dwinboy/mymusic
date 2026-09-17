import type { Metadata } from "next";

export const metadata: Metadata = {
  // Embeds live on other sites; the song page is the one to index.
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="embed-root">{children}</div>;
}
