import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything here is either private to one person or useless in a
      // result. /requests holds commission briefs, which describe people who
      // never signed up; it is behind a login, and it should not be crawled
      // either.
      disallow: [
        "/admin",
        "/api",
        "/library",
        "/downloads",
        "/requests",
        "/creator",
        "/login",
        "/register",
        "/search",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
