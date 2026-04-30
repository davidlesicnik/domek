import type { MetadataRoute } from "next";

import { getBlogSitemapEntries } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getBlogSitemapEntries();
}
