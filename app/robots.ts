import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Public pages may be indexed; a student's own pages may not (they need a
// login anyway, this just keeps crawlers from trying).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/profile",
        "/recommendations",
        "/saved",
        "/applications",
        "/offers",
        "/compare",
        "/universities/new",
        "/auth/",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
