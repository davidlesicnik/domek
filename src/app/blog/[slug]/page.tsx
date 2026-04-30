import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard, BlogPromoCta, BlogTopicPill } from "@/components/blog/blog-shell";
import { getAllPublishedPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { getSiteOrigin, getSiteUrl } from "@/lib/site";

function formatBlogDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export async function generateStaticParams() {
  const posts = await getAllPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  const canonicalUrl = getSiteUrl(post.canonicalPath);
  const imageUrl = post.coverImage ? getSiteUrl(post.coverImage) : undefined;

  return {
    alternates: {
      canonical: post.canonicalPath,
    },
    description: post.seoDescription ?? post.description,
    metadataBase: new URL(getSiteOrigin()),
    openGraph: {
      description: post.seoDescription ?? post.description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      modifiedTime: post.updatedAt,
      publishedTime: post.publishedAt,
      title: post.seoTitle ?? post.title,
      type: "article",
      url: canonicalUrl,
    },
    robots: {
      follow: true,
      index: true,
    },
    title: post.seoTitle ?? post.title,
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      description: post.seoDescription ?? post.description,
      images: imageUrl ? [imageUrl] : undefined,
      title: post.seoTitle ?? post.title,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post, 2);
  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    dateModified: post.updatedAt ?? post.publishedAt,
    datePublished: post.publishedAt,
    description: post.seoDescription ?? post.description,
    headline: post.seoTitle ?? post.title,
    mainEntityOfPage: getSiteUrl(post.canonicalPath),
    publisher: {
      "@type": "Organization",
      name: "Domek",
      url: getSiteUrl("/en-US"),
    },
    url: getSiteUrl(post.canonicalPath),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        item: getSiteUrl("/en-US"),
        name: "Home",
        position: 1,
      },
      {
        "@type": "ListItem",
        item: getSiteUrl("/blog"),
        name: "Blog",
        position: 2,
      },
      {
        "@type": "ListItem",
        item: getSiteUrl(post.canonicalPath),
        name: post.title,
        position: 3,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="mx-auto max-w-4xl">
        <Link className="text-sm font-medium text-[#526c56] transition hover:text-[#3f5745]" href="/blog">
          Back to blog
        </Link>

        <header className="mt-5 rounded-md bg-[#fffdf8] px-6 py-8 shadow-[0_8px_40px_rgba(31,35,30,0.06)] sm:px-8 sm:py-10">
          <div className="flex flex-wrap items-center gap-3">
            <BlogTopicPill topic={post.topic} />
            <p className="text-xs text-[#8a8f8b]">{formatBlogDate(post.publishedAt)}</p>
            <p className="text-xs text-[#8a8f8b]">By {post.authorName}</p>
          </div>
          <h1 className="mt-4 max-w-3xl font-serif text-[clamp(2.5rem,8vw,4.5rem)] font-semibold leading-[0.95] tracking-normal text-[#171a18]">
            {post.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#68706b]">{post.description}</p>
        </header>

        <div className="mt-8 rounded-md bg-[#fffdf8] px-6 py-8 shadow-[0_8px_40px_rgba(31,35,30,0.06)] sm:px-8 sm:py-10">
          <div className="mx-auto max-w-3xl">{post.content}</div>
        </div>

        <div className="mt-8">
          <BlogPromoCta
            body={
              post.ctaBody ??
              "Domek gives households one calm board for plans, chores, notes, and shared lists, so the system stays visible after the article ends."
            }
            ctaLabel={post.ctaLabel ?? "Open Domek"}
            ctaHref={post.ctaHref ?? "/en-US/login"}
            eyebrow="Bring it home"
            title={post.ctaTitle ?? "Keep the next week in one place."}
          />
        </div>
      </article>

      {relatedPosts.length > 0 ? (
        <section className="mx-auto mt-14 max-w-5xl">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">Keep reading</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">More ideas for the home board.</h2>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {relatedPosts.map((relatedPost) => (
              <ArticleCard
                key={relatedPost.slug}
                description={relatedPost.description}
                href={`/blog/${relatedPost.slug}`}
                publishedLabel={formatBlogDate(relatedPost.publishedAt)}
                title={relatedPost.title}
                topic={relatedPost.topic}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
