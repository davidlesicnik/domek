import { getBlogRssItems } from "@/lib/blog";
import { getSiteUrl } from "@/lib/site";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const posts = await getBlogRssItems();
  const siteUrl = getSiteUrl("/blog");
  const items = posts
    .map((post) => {
      const url = getSiteUrl(post.canonicalPath);

      return [
        "<item>",
        `<title>${escapeXml(post.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid>${escapeXml(url)}</guid>`,
        `<description>${escapeXml(post.seoDescription ?? post.description)}</description>`,
        `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
        "</item>",
      ].join("");
    })
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Domek Blog</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Practical home-planning ideas for calmer households.</description>
    ${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
