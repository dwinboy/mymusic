import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSiteSettings, DEFAULT_SETTINGS } from "@/lib/settings";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vibe Banger — Independent Sound",
    template: "%s — Vibe Banger",
  },
  description: "An original catalogue of AI-composed music, streamed in premium quality.",
  applicationName: "Vibe Banger",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Vibe Banger",
    title: "Vibe Banger — Independent Sound",
    description: "An original catalogue of AI-composed music, streamed in premium quality.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Banger — Independent Sound",
    description: "An original catalogue of AI-composed music, streamed in premium quality.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vibe Banger",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0b",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings().catch(() => DEFAULT_SETTINGS);
  const accentOverride =
    settings.accentColor !== DEFAULT_SETTINGS.accentColor
      ? ({ "--color-accent": settings.accentColor } as React.CSSProperties)
      : undefined;

  return (
    <html
      lang="en"
      className={`${display.variable} h-full antialiased`}
      data-theme="dark"
      style={accentOverride}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Providers>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
