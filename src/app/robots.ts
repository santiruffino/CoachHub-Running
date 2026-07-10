import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated product surfaces and internal routes carry no SEO value
        // and should never be crawled or indexed.
        disallow: [
          "/dashboard/",
          "/api/",
          "/onboarding/",
          "/accept-invitation/",
          "/strava/",
          "/login",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
