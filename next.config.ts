import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's generated client, and ffmpeg-static's binary-path lookup, both
  // do dynamic fs resolution relative to their own package directory at
  // runtime — bundling them breaks that (and bloats serverless output), so
  // let Next.js require() them as plain external Node modules instead.
  serverExternalPackages: ["@prisma/client", "ffmpeg-static"],

  images: {
    remotePatterns: [
      // Cloudinary-hosted artwork (IMAGE_PROVIDER=cloudinary).
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
