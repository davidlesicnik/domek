import type { MetadataRoute } from "next";

import { getBlogSitemapEntries } from "@/lib/blog";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogEntries = await getBlogSitemapEntries();
  const legalEntries: MetadataRoute.Sitemap = [
    {
      changeFrequency: "monthly",
      lastModified: new Date("2026-05-26"),
      priority: 0.6,
      url: getSiteUrl("/privacy"),
    },
    {
      changeFrequency: "monthly",
      lastModified: new Date("2026-05-26"),
      priority: 0.6,
      url: getSiteUrl("/terms"),
    },
    {
      changeFrequency: "monthly",
      lastModified: new Date("2026-05-26"),
      priority: 0.5,
      url: getSiteUrl("/contact"),
    },
    {
      changeFrequency: "monthly",
      lastModified: new Date("2026-05-26"),
      priority: 0.5,
      url: getSiteUrl("/account-deletion"),
    },
  ];

  return [...legalEntries, ...blogEntries];
}
