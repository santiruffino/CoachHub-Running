import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { comparisons } from "./comparativas/comparisons";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const comparativas: MetadataRoute.Sitemap = [
    {
      url: `${base}/comparativas`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...comparisons.map((c) => ({
      url: `${base}/comparativas/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...comparativas,
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
