import fs from "node:fs/promises";
import path from "node:path";
import type { MetadataRoute } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";
import { cache } from "react";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { blogMdxComponents } from "@/components/blog/mdx-components";
import { getSiteUrl } from "@/lib/site";

const BLOG_CONTENT_DIR = path.join(process.cwd(), "content", "blog");

const dateFrontmatterSchema = z.union([z.string().min(1), z.date()]);

const blogFrontmatterSchema = z.object({
  authorName: z.string().min(1),
  canonicalPath: z.string().startsWith("/").optional(),
  coverImage: z.string().min(1).optional(),
  ctaBody: z.string().min(1).optional(),
  ctaHref: z.string().startsWith("/").optional(),
  ctaLabel: z.string().min(1).optional(),
  ctaTitle: z.string().min(1).optional(),
  description: z.string().min(1),
  draft: z.boolean().optional().default(false),
  publishedAt: dateFrontmatterSchema,
  seoDescription: z.string().min(1).optional(),
  seoTitle: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  topic: z.string().min(1),
  updatedAt: dateFrontmatterSchema.optional(),
});

type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

type BlogPostRecord = Readonly<{
  meta: BlogPostMeta;
  source: string;
}>;

export type BlogPostMeta = Readonly<{
  authorName: string;
  canonicalPath: string;
  coverImage?: string;
  ctaBody?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaTitle?: string;
  description: string;
  draft: boolean;
  publishedAt: string;
  seoDescription?: string;
  seoTitle?: string;
  slug: string;
  title: string;
  topic: string;
  updatedAt?: string;
}>;

export type BlogPost = BlogPostMeta & Readonly<{
  content: ReactNode;
}>;

function normalizeDate(value: string | Date, field: "publishedAt" | "updatedAt", slug: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Blog post "${slug}" has an invalid ${field} value: "${value}".`);
  }

  return parsed.toISOString();
}

function compareNewestFirst(a: BlogPostMeta, b: BlogPostMeta): number {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

async function readBlogFilePaths(): Promise<string[]> {
  try {
    const entries = await fs.readdir(BLOG_CONTENT_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map((entry) => path.join(BLOG_CONTENT_DIR, entry.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

const loadAllPosts = cache(async (): Promise<BlogPostRecord[]> => {
  const files = await readBlogFilePaths();
  const records = await Promise.all(
    files.map(async (filePath) => {
      const source = await fs.readFile(filePath, "utf8");
      const parsed = matter(source);
      const frontmatter = blogFrontmatterSchema.parse(parsed.data) as BlogFrontmatter;
      const publishedAt = normalizeDate(frontmatter.publishedAt, "publishedAt", frontmatter.slug);
      const updatedAt = frontmatter.updatedAt
        ? normalizeDate(frontmatter.updatedAt, "updatedAt", frontmatter.slug)
        : undefined;

      return {
        meta: {
          authorName: frontmatter.authorName,
          canonicalPath: frontmatter.canonicalPath ?? `/blog/${frontmatter.slug}`,
          coverImage: frontmatter.coverImage,
          ctaBody: frontmatter.ctaBody,
          ctaHref: frontmatter.ctaHref,
          ctaLabel: frontmatter.ctaLabel,
          ctaTitle: frontmatter.ctaTitle,
          description: frontmatter.description,
          draft: frontmatter.draft,
          publishedAt,
          seoDescription: frontmatter.seoDescription,
          seoTitle: frontmatter.seoTitle,
          slug: frontmatter.slug,
          title: frontmatter.title,
          topic: frontmatter.topic,
          updatedAt,
        },
        source: parsed.content,
      } satisfies BlogPostRecord;
    }),
  );

  const slugs = new Set<string>();

  records.forEach(({ meta }) => {
    if (slugs.has(meta.slug)) {
      throw new Error(`Duplicate blog slug detected: "${meta.slug}".`);
    }

    slugs.add(meta.slug);
  });

  return records.sort((left, right) => compareNewestFirst(left.meta, right.meta));
});

export async function getAllPublishedPosts(): Promise<BlogPostMeta[]> {
  const posts = await loadAllPosts();
  return posts.filter((post) => !post.meta.draft).map((post) => post.meta);
}

export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const posts = await loadAllPosts();
  const post = posts.find((entry) => entry.meta.slug === slug && !entry.meta.draft);

  if (!post) {
    return null;
  }

  const compiled = await compileMDX({
    components: blogMdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
      parseFrontmatter: false,
    },
    source: post.source,
  });

  return {
    ...post.meta,
    content: compiled.content,
  };
});

export async function getRelatedPosts(post: BlogPostMeta, limit = 3): Promise<BlogPostMeta[]> {
  const publishedPosts = await getAllPublishedPosts();
  const sameTopic = publishedPosts.filter((candidate) => candidate.slug !== post.slug && candidate.topic === post.topic);
  const remaining = publishedPosts.filter((candidate) => candidate.slug !== post.slug && candidate.topic !== post.topic);

  return [...sameTopic, ...remaining].slice(0, limit);
}

export async function getBlogSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPublishedPosts();
  const newestPost = posts[0];

  return [
    {
      changeFrequency: "weekly",
      lastModified: newestPost ? new Date(newestPost.updatedAt ?? newestPost.publishedAt) : new Date(),
      priority: 0.8,
      url: getSiteUrl("/blog"),
    },
    ...posts.map((post) => ({
      changeFrequency: "monthly" as const,
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      priority: 0.7,
      url: getSiteUrl(post.canonicalPath),
    })),
  ];
}

export async function getBlogRssItems(): Promise<BlogPostMeta[]> {
  return getAllPublishedPosts();
}
