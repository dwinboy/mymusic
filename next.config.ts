import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's generated client, and ffmpeg-static's binary-path lookup, both
  // do dynamic fs resolution relative to their own package directory at
  // runtime — bundling them breaks that (and bloats serverless output), so
  // let Next.js require() them as plain external Node modules instead.
  serverExternalPackages: ["@prisma/client", "ffmpeg-static"],

  async headers() {
    return [
      {
        // The embeddable player is meant to be framed by any site.
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        // Everything else can't be framed elsewhere, so pages like sign-in
        // and admin can't be overlaid by another site (clickjacking).
        source: "/:path((?!embed/).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      // Cloudinary-hosted artwork (IMAGE_PROVIDER=cloudinary).
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
